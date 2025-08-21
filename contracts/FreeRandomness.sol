// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title FreeRandomness
 * @dev FREE alternatives to Chainlink VRF for secure randomness
 * 
 * IMPLEMENTED SOLUTIONS:
 * 1. Commit-Reveal Scheme (FREE)
 * 2. Multi-Party Randomness (FREE)
 * 3. Enhanced On-Chain Entropy (FREE)
 * 4. Time-Delayed Randomness (FREE)
 * 5. User-Contributed Entropy (FREE)
 */
contract FreeRandomness is ReentrancyGuard, Ownable {
    // Commit-Reveal Scheme
    struct Commit {
        bytes32 commitment;
        uint256 timestamp;
        bool revealed;
        uint256 randomValue;
    }
    
    // Multi-Party Randomness
    struct RandomnessRound {
        uint256 roundId;
        uint256 totalContributors;
        uint256 totalEntropy;
        uint256 finalRandomNumber;
        bool isComplete;
        uint256 deadline;
    }
    
    // Enhanced Entropy Sources
    struct EntropySource {
        uint256 blockNumber;
        uint256 timestamp;
        uint256 difficulty;
        uint256 gasLimit;
        uint256 gasUsed;
        uint256 baseFee;
        address miner;
    }
    
    // Mappings
    mapping(address => Commit) public commits;
    mapping(uint256 => RandomnessRound) public randomnessRounds;
    mapping(uint256 => mapping(address => uint256)) public userContributions;
    mapping(uint256 => address[]) public roundContributors;
    
    // State variables
    uint256 public currentRoundId;
    uint256 public commitPhaseDuration = 1 hours;
    uint256 public revealPhaseDuration = 30 minutes;
    uint256 public minContributors = 3;
    uint256 public maxContributors = 100;
    
    // Events
    event RandomnessRequested(uint256 indexed roundId, address indexed requester);
    event CommitmentSubmitted(uint256 indexed roundId, address indexed contributor, bytes32 commitment);
    event RandomnessRevealed(uint256 indexed roundId, address indexed contributor, uint256 randomValue);
    event RandomnessFinalized(uint256 indexed roundId, uint256 finalRandomNumber, uint256 totalContributors);
    event EntropyCollected(uint256 indexed roundId, EntropySource entropy);
    
    constructor() Ownable(msg.sender) {
        currentRoundId = 1;
    }
    
    /**
     * @dev Request randomness for a new round
     */
    function requestRandomness() external nonReentrant returns (uint256 roundId) {
        roundId = currentRoundId++;
        
        RandomnessRound storage round = randomnessRounds[roundId];
        round.roundId = roundId;
        round.deadline = block.timestamp + commitPhaseDuration;
        round.isComplete = false;
        
        emit RandomnessRequested(roundId, msg.sender);
        return roundId;
    }
    
    /**
     * @dev Submit a commitment for randomness
     */
    function submitCommitment(uint256 roundId, bytes32 commitment) external nonReentrant {
        RandomnessRound storage round = randomnessRounds[roundId];
        require(block.timestamp <= round.deadline, "Commit phase ended");
        require(!round.isComplete, "Round already completed");
        require(roundContributors[roundId].length < maxContributors, "Max contributors reached");
        
        // Check if user already contributed
        bool alreadyContributed = false;
        for (uint256 i = 0; i < roundContributors[roundId].length; i++) {
            if (roundContributors[roundId][i] == msg.sender) {
                alreadyContributed = true;
                break;
            }
        }
        require(!alreadyContributed, "Already contributed to this round");
        
        // Add contributor
        roundContributors[roundId].push(msg.sender);
        round.totalContributors = round.totalContributors + 1;
        
        // Store commitment
        commits[msg.sender] = Commit({
            commitment: commitment,
            timestamp: block.timestamp,
            revealed: false,
            randomValue: 0
        });
        
        emit CommitmentSubmitted(roundId, msg.sender, commitment);
    }
    
    /**
     * @dev Reveal the random value
     */
    function revealRandomness(uint256 roundId, uint256 randomValue, bytes32 salt) external nonReentrant {
        RandomnessRound storage round = randomnessRounds[roundId];
        require(block.timestamp > round.deadline, "Commit phase still active");
        require(block.timestamp <= round.deadline + revealPhaseDuration, "Reveal phase ended");
        require(!round.isComplete, "Round already completed");
        
        Commit storage commit = commits[msg.sender];
        require(commit.commitment != bytes32(0), "No commitment found");
        require(!commit.revealed, "Already revealed");
        
        // Verify commitment
        bytes32 expectedCommitment = keccak256(abi.encodePacked(randomValue, salt, msg.sender));
        require(commit.commitment == expectedCommitment, "Invalid commitment");
        
        // Store revealed value
        commit.revealed = true;
        commit.randomValue = randomValue;
        
        // Add to total entropy
        round.totalEntropy = round.totalEntropy + randomValue;
        userContributions[roundId][msg.sender] = randomValue;
        
        emit RandomnessRevealed(roundId, msg.sender, randomValue);
        
        // Check if we have enough contributors to finalize
        if (round.totalContributors >= minContributors) {
            _finalizeRandomness(roundId);
        }
    }
    
    /**
     * @dev Finalize randomness for a round
     */
    function _finalizeRandomness(uint256 roundId) internal {
        RandomnessRound storage round = randomnessRounds[roundId];
        require(!round.isComplete, "Already finalized");
        
        // Collect on-chain entropy
        EntropySource memory entropy = _collectEntropy();
        
        // Calculate final random number
        uint256 finalRandom = _calculateFinalRandomness(roundId, entropy);
        
        round.finalRandomNumber = finalRandom;
        round.isComplete = true;
        
        emit RandomnessFinalized(roundId, finalRandom, round.totalContributors);
        emit EntropyCollected(roundId, entropy);
    }
    
    /**
     * @dev Collect on-chain entropy sources
     */
    function _collectEntropy() internal view returns (EntropySource memory) {
        return EntropySource({
            blockNumber: block.number,
            timestamp: block.timestamp,
            difficulty: block.prevrandao,
            gasLimit: block.gaslimit,
            gasUsed: block.gaslimit,
            baseFee: block.basefee,
            miner: block.coinbase
        });
    }
    
    /**
     * @dev Calculate final randomness using multiple entropy sources
     */
    function _calculateFinalRandomness(uint256 roundId, EntropySource memory entropy) internal view returns (uint256) {
        RandomnessRound storage round = randomnessRounds[roundId];
        
        // Combine multiple entropy sources
        uint256 combinedEntropy = round.totalEntropy;
        combinedEntropy = combinedEntropy + entropy.blockNumber;
        combinedEntropy = combinedEntropy + entropy.timestamp;
        combinedEntropy = combinedEntropy + entropy.difficulty;
        combinedEntropy = combinedEntropy + entropy.gasLimit;
        combinedEntropy = combinedEntropy + entropy.gasUsed;
        combinedEntropy = combinedEntropy + entropy.baseFee;
        combinedEntropy = combinedEntropy + uint256(uint160(entropy.miner));
        
        // Add user-specific entropy
        for (uint256 i = 0; i < roundContributors[roundId].length; i++) {
            address contributor = roundContributors[roundId][i];
            combinedEntropy = combinedEntropy + uint256(uint160(contributor));
            combinedEntropy = combinedEntropy + userContributions[roundId][contributor];
        }
        
        // Add time-based entropy
        combinedEntropy = combinedEntropy + block.timestamp;
        combinedEntropy = combinedEntropy + roundId;
        
        // Final hash for unpredictability
        return uint256(keccak256(abi.encodePacked(
            combinedEntropy,
            blockhash(block.number - 1),
            blockhash(block.number - 2),
            blockhash(block.number - 3)
        )));
    }
    
    /**
     * @dev Get final random number for a round
     */
    function getFinalRandomNumber(uint256 roundId) external view returns (uint256) {
        RandomnessRound storage round = randomnessRounds[roundId];
        require(round.isComplete, "Round not finalized");
        return round.finalRandomNumber;
    }
    
    /**
     * @dev Force finalize a round (owner only, for emergency)
     */
    function forceFinalize(uint256 roundId) external onlyOwner {
        RandomnessRound storage round = randomnessRounds[roundId];
        require(!round.isComplete, "Already finalized");
        require(block.timestamp > round.deadline + revealPhaseDuration, "Reveal phase not ended");
        
        _finalizeRandomness(roundId);
    }
    
    /**
     * @dev Get round information
     */
    function getRoundInfo(uint256 roundId) external view returns (
        uint256 totalContributors,
        uint256 totalEntropy,
        uint256 finalRandomNumber,
        bool isComplete,
        uint256 deadline
    ) {
        RandomnessRound storage round = randomnessRounds[roundId];
        return (
            round.totalContributors,
            round.totalEntropy,
            round.finalRandomNumber,
            round.isComplete,
            round.deadline
        );
    }
    
    /**
     * @dev Get contributors for a round
     */
    function getRoundContributors(uint256 roundId) external view returns (address[] memory) {
        return roundContributors[roundId];
    }
    
    /**
     * @dev Update round parameters (owner only)
     */
    function updateRoundParameters(
        uint256 _commitPhaseDuration,
        uint256 _revealPhaseDuration,
        uint256 _minContributors,
        uint256 _maxContributors
    ) external onlyOwner {
        commitPhaseDuration = _commitPhaseDuration;
        revealPhaseDuration = _revealPhaseDuration;
        minContributors = _minContributors;
        maxContributors = _maxContributors;
    }

    /**
     * @dev Get current randomness round
     */
    function getCurrentRandomnessRound() external view returns (uint256) {
        return currentRoundId;
    }
} 