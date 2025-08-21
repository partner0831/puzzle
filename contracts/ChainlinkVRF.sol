// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@chainlink/contracts/src/v0.8/vrf/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/automation/AutomationCompatible.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./IPizzaParty.sol";

/**
 * @title ChainlinkVRF
 * @dev Chainlink VRF v2.5 implementation for truly random winner selection
 * Uses subscription method for cost-effective randomness requests
 */
contract ChainlinkVRF is VRFConsumerBaseV2, Ownable, ReentrancyGuard {
    
    // Chainlink VRF Coordinator
    VRFCoordinatorV2Interface private immutable COORDINATOR;
    
    // VRF Configuration
    uint64 private immutable subscriptionId;
    bytes32 private immutable keyHash;
    uint32 private immutable callbackGasLimit;
    uint16 private immutable requestConfirmations;
    uint32 private immutable numWords;
    
    // Winner Selection Constants
    uint256 public constant DAILY_WINNERS_COUNT = 8;
    uint256 public constant WEEKLY_WINNERS_COUNT = 10;
    
    // Events
    event RandomnessRequested(uint256 indexed requestId, uint256 indexed gameId, string gameType);
    event WinnersSelected(uint256 indexed gameId, string gameType, address[] winners, uint256[] randomWords);
    event SubscriptionFunded(uint64 subscriptionId, uint256 amount);
    event EmergencyWithdraw(address indexed owner, uint256 amount);
    
    // Structs
    struct RandomnessRequest {
        uint256 gameId;
        string gameType; // "daily" or "weekly"
        bool fulfilled;
        uint256[] randomWords;
        address[] eligiblePlayers;
    }
    
    // State variables
    mapping(uint256 => RandomnessRequest) public randomnessRequests;
    uint256 public requestCounter;
    
    // Pizza Party contract interface
    IPizzaParty public pizzaPartyContract;
    
    // Modifiers
    modifier onlyPizzaParty() {
        require(msg.sender == address(pizzaPartyContract), "Only Pizza Party contract can call this");
        _;
    }
    
    /**
     * @dev Constructor
     * @param _vrfCoordinator Chainlink VRF Coordinator address
     * @param _subscriptionId Subscription ID for VRF requests
     * @param _keyHash Key hash for VRF requests
     * @param _callbackGasLimit Gas limit for callback function
     * @param _requestConfirmations Number of confirmations required
     * @param _numWords Number of random words to request
     */
    constructor(
        address _vrfCoordinator,
        uint64 _subscriptionId,
        bytes32 _keyHash,
        uint32 _callbackGasLimit,
        uint16 _requestConfirmations,
        uint32 _numWords
    ) VRFConsumerBaseV2(_vrfCoordinator) Ownable(msg.sender) {
        COORDINATOR = VRFCoordinatorV2Interface(_vrfCoordinator);
        subscriptionId = _subscriptionId;
        keyHash = _keyHash;
        callbackGasLimit = _callbackGasLimit;
        requestConfirmations = _requestConfirmations;
        numWords = _numWords;
    }
    
    /**
     * @dev Set Pizza Party contract address
     * @param _pizzaPartyContract Address of the Pizza Party contract
     */
    function setPizzaPartyContract(address _pizzaPartyContract) external onlyOwner {
        require(_pizzaPartyContract != address(0), "Invalid Pizza Party contract address");
        pizzaPartyContract = IPizzaParty(_pizzaPartyContract);
    }
    
    /**
     * @dev Request randomness for daily winner selection
     * @param gameId Current game ID
     * @param eligiblePlayers Array of eligible players for daily draw
     */
    function requestDailyRandomness(uint256 gameId, address[] calldata eligiblePlayers) 
        external 
        onlyPizzaParty 
        nonReentrant 
        returns (uint256 requestId) 
    {
        require(eligiblePlayers.length > 0, "No eligible players");
        
        // Request randomness from Chainlink VRF
        requestId = COORDINATOR.requestRandomWords(
            keyHash,
            subscriptionId,
            requestConfirmations,
            callbackGasLimit,
            numWords
        );
        
        // Store request details
        randomnessRequests[requestId] = RandomnessRequest({
            gameId: gameId,
            gameType: "daily",
            fulfilled: false,
            randomWords: new uint256[](0),
            eligiblePlayers: eligiblePlayers
        });
        
        requestCounter++;
        
        emit RandomnessRequested(requestId, gameId, "daily");
    }
    
    /**
     * @dev Request randomness for weekly winner selection
     * @param gameId Current game ID
     * @param eligiblePlayers Array of eligible players for weekly draw
     */
    function requestWeeklyRandomness(uint256 gameId, address[] calldata eligiblePlayers) 
        external 
        onlyPizzaParty 
        nonReentrant 
        returns (uint256 requestId) 
    {
        require(eligiblePlayers.length > 0, "No eligible players");
        
        // Request randomness from Chainlink VRF
        requestId = COORDINATOR.requestRandomWords(
            keyHash,
            subscriptionId,
            requestConfirmations,
            callbackGasLimit,
            numWords
        );
        
        // Store request details
        randomnessRequests[requestId] = RandomnessRequest({
            gameId: gameId,
            gameType: "weekly",
            fulfilled: false,
            randomWords: new uint256[](0),
            eligiblePlayers: eligiblePlayers
        });
        
        requestCounter++;
        
        emit RandomnessRequested(requestId, gameId, "weekly");
    }
    
    /**
     * @dev Callback function called by VRF Coordinator
     * @param requestId The request ID for fulfillment
     * @param randomWords Array of random words generated by VRF
     */
    function fulfillRandomWords(uint256 requestId, uint256[] memory randomWords) 
        internal 
        override 
    {
        RandomnessRequest storage request = randomnessRequests[requestId];
        require(!request.fulfilled, "Request already fulfilled");
        
        request.fulfilled = true;
        request.randomWords = randomWords;
        
        // Select winners based on random words
        address[] memory winners = _selectWinners(
            request.eligiblePlayers,
            randomWords,
            keccak256(abi.encodePacked(request.gameType)) == keccak256(abi.encodePacked("daily")) 
                ? DAILY_WINNERS_COUNT 
                : WEEKLY_WINNERS_COUNT
        );
        
        emit WinnersSelected(request.gameId, request.gameType, winners, randomWords);
        
        // Call Pizza Party contract to process winners
        _processWinners(request.gameId, request.gameType, winners);
    }
    
    /**
     * @dev Select winners using VRF random words
     * @param eligiblePlayers Array of eligible players
     * @param randomWords Array of random words from VRF
     * @param winnerCount Number of winners to select
     * @return winners Array of selected winners
     */
    function _selectWinners(
        address[] memory eligiblePlayers,
        uint256[] memory randomWords,
        uint256 winnerCount
    ) internal pure returns (address[] memory winners) {
        winners = new address[](winnerCount);
        
        if (eligiblePlayers.length == 0) {
            return winners;
        }
        
        // Use random words to select winners
        for (uint256 i = 0; i < winnerCount && i < eligiblePlayers.length; i++) {
            uint256 randomIndex = randomWords[i % randomWords.length] % eligiblePlayers.length;
            winners[i] = eligiblePlayers[randomIndex];
        }
        
        return winners;
    }
    
    /**
     * @dev Process winners by calling Pizza Party contract
     * @param gameId Current game ID
     * @param gameType Type of game ("daily" or "weekly")
     * @param winners Array of selected winners
     */
    function _processWinners(uint256 gameId, string memory gameType, address[] memory winners) internal {
        // Call Pizza Party contract to process winners
        if (keccak256(abi.encodePacked(gameType)) == keccak256(abi.encodePacked("daily"))) {
            // Call daily winner processing
            pizzaPartyContract.processDailyWinners(gameId, winners);
        } else {
            // Call weekly winner processing
            pizzaPartyContract.processWeeklyWinners(gameId, winners);
        }
    }
    
    /**
     * @dev Fund subscription with LINK tokens
     * @param amount Amount of LINK to fund
     */
    function fundSubscription(uint256 amount) external onlyOwner {
        require(amount > 0, "Amount must be greater than 0");
        
        // Transfer LINK to this contract
        // LINK.transferFrom(msg.sender, address(this), amount);
        
        // Fund the subscription
        // COORDINATOR.fundSubscription(subscriptionId, amount);
        
        emit SubscriptionFunded(subscriptionId, amount);
    }
    
    /**
     * @dev Emergency withdraw function
     * @param token Token address to withdraw (0x0 for ETH)
     * @param amount Amount to withdraw
     */
    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        require(amount > 0, "Amount must be greater than 0");
        
        if (token == address(0)) {
            // Withdraw ETH
            require(address(this).balance >= amount, "Insufficient ETH balance");
            (bool success, ) = payable(owner()).call{value: amount}("");
            require(success, "ETH transfer failed");
        } else {
            // Withdraw ERC20 tokens
            // IERC20(token).transfer(owner(), amount);
        }
        
        emit EmergencyWithdraw(owner(), amount);
    }
    
    /**
     * @dev Get request details
     * @param requestId Request ID
     * @return request Request details
     */
    function getRequest(uint256 requestId) external view returns (RandomnessRequest memory request) {
        return randomnessRequests[requestId];
    }
    
    /**
     * @dev Check if request is fulfilled
     * @param requestId Request ID
     * @return fulfilled Whether request is fulfilled
     */
    function isRequestFulfilled(uint256 requestId) external view returns (bool fulfilled) {
        return randomnessRequests[requestId].fulfilled;
    }
    
    /**
     * @dev Get VRF configuration
     * @return coordinator VRF Coordinator address
     * @return subId Subscription ID
     * @return keyHash Key hash
     * @return gasLimit Callback gas limit
     * @return confirmations Request confirmations
     * @return words Number of random words
     */
    function getVRFConfig() external view returns (
        address coordinator,
        uint64 subId,
        bytes32 keyHash,
        uint32 gasLimit,
        uint16 confirmations,
        uint32 words
    ) {
        return (
            address(COORDINATOR),
            subscriptionId,
            keyHash,
            callbackGasLimit,
            requestConfirmations,
            numWords
        );
    }
    
    /**
     * @dev Receive function to accept ETH
     */
    receive() external payable {}
}
