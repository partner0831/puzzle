// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title PizzaPartyAdvancedRandomness
 * @dev Advanced randomness system with multi-party commit-reveal scheme
 * 
 * FEATURES:
 * - Multi-party commit-reveal randomness
 * - Entropy contribution from multiple sources
 * - Secure randomness generation
 * - Round-based randomness collection
 * - Anti-manipulation measures
 */
contract PizzaPartyAdvancedRandomness is ReentrancyGuard, Ownable, Pausable {
    
    // Round structure
    struct RandomnessRound {
        uint256 roundId;
        uint256 startTime;
        uint256 endTime;
        uint256 commitPhaseEnd;
        uint256 revealPhaseEnd;
        bytes32 finalSeed;
        bool isCompleted;
        uint256 totalContributors;
        uint256 totalEntropy;
        mapping(address => bytes32) commitments;
        mapping(address => bool) hasRevealed;
        mapping(address => bool) hasCommitted;
        address[] contributors;
    }
    
    // Contributor data
    struct ContributorData {
        uint256 totalContributions;
        uint256 successfulReveals;
        uint256 failedReveals;
        uint256 lastContribution;
        bool isBlacklisted;
        uint256 reputation;
    }
    
    // System constants
    uint256 public constant COMMIT_PHASE_DURATION = 1 hours;
    uint256 public constant REVEAL_PHASE_DURATION = 30 minutes;
    uint256 public constant MIN_CONTRIBUTORS = 3;
    uint256 public constant MAX_CONTRIBUTORS = 50;
    uint256 public constant MIN_ENTROPY_BITS = 128;
    uint256 public constant REPUTATION_THRESHOLD = 10;
    
    // Round tracking
    mapping(uint256 => RandomnessRound) public randomnessRounds;
    uint256 public currentRoundId;
    uint256 public totalRounds;
    
    // Contributor tracking
    mapping(address => ContributorData) public contributorData;
    mapping(address => bool) public blacklistedContributors;
    
    // Global statistics
    uint256 public totalEntropyGenerated;
    uint256 public totalContributors;
    uint256 public activeContributors;
    
    // Events
    event RoundStarted(
        uint256 indexed roundId,
        uint256 startTime,
        uint256 commitPhaseEnd,
        uint256 revealPhaseEnd
    );
    
    event EntropyCommitted(
        uint256 indexed roundId,
        address indexed contributor,
        bytes32 commitment,
        uint256 timestamp
    );
    
    event EntropyRevealed(
        uint256 indexed roundId,
        address indexed contributor,
        bytes32 entropy,
        uint256 timestamp
    );
    
    event RoundCompleted(
        uint256 indexed roundId,
        bytes32 finalSeed,
        uint256 totalContributors,
        uint256 totalEntropy,
        uint256 timestamp
    );
    
    event ContributorBlacklisted(address indexed contributor, bool blacklisted);
    
    event ReputationUpdated(
        address indexed contributor,
        uint256 oldReputation,
        uint256 newReputation
    );
    
    // Modifiers
    modifier notBlacklisted(address contributor) {
        require(!blacklistedContributors[contributor], "Contributor is blacklisted");
        require(!contributorData[contributor].isBlacklisted, "Contributor is blacklisted");
        _;
    }
    
    modifier roundExists(uint256 roundId) {
        require(roundId <= totalRounds, "Round does not exist");
        _;
    }
    
    modifier roundActive(uint256 roundId) {
        require(roundId == currentRoundId, "Round is not active");
        require(!randomnessRounds[roundId].isCompleted, "Round is completed");
        _;
    }
    
    modifier inCommitPhase(uint256 roundId) {
        require(block.timestamp <= randomnessRounds[roundId].commitPhaseEnd, "Commit phase ended");
        _;
    }
    
    modifier inRevealPhase(uint256 roundId) {
        require(
            block.timestamp > randomnessRounds[roundId].commitPhaseEnd &&
            block.timestamp <= randomnessRounds[roundId].revealPhaseEnd,
            "Not in reveal phase"
        );
        _;
    }
    
    modifier notCommitted(uint256 roundId, address contributor) {
        require(!randomnessRounds[roundId].hasCommitted[contributor], "Already committed");
        _;
    }
    
    modifier notRevealed(uint256 roundId, address contributor) {
        require(!randomnessRounds[roundId].hasRevealed[contributor], "Already revealed");
        _;
    }
    
    constructor() Ownable(msg.sender) {
        currentRoundId = 1;
        totalRounds = 0;
    }
    
    /**
     * @dev Start a new randomness round
     */
    function startNewRound() external onlyOwner whenNotPaused {
        require(
            totalRounds == 0 || randomnessRounds[currentRoundId].isCompleted,
            "Current round not completed"
        );
        
        uint256 roundId = currentRoundId;
        uint256 startTime = block.timestamp;
        uint256 commitPhaseEnd = startTime + COMMIT_PHASE_DURATION;
        uint256 revealPhaseEnd = commitPhaseEnd + REVEAL_PHASE_DURATION;
        
        RandomnessRound storage round = randomnessRounds[roundId];
        round.roundId = roundId;
        round.startTime = startTime;
        round.endTime = revealPhaseEnd;
        round.commitPhaseEnd = commitPhaseEnd;
        round.revealPhaseEnd = revealPhaseEnd;
        round.isCompleted = false;
        round.totalContributors = 0;
        round.totalEntropy = 0;
        
        totalRounds++;
        
        emit RoundStarted(roundId, startTime, commitPhaseEnd, revealPhaseEnd);
    }
    
    /**
     * @dev Commit entropy to current round
     */
    function commitEntropy(bytes32 commitment) 
        external 
        nonReentrant 
        whenNotPaused 
        roundActive(currentRoundId)
        inCommitPhase(currentRoundId)
        notCommitted(currentRoundId, msg.sender)
        notBlacklisted(msg.sender)
    {
        require(commitment != bytes32(0), "Invalid commitment");
        
        RandomnessRound storage round = randomnessRounds[currentRoundId];
        
        // Check contributor limit
        require(round.totalContributors < MAX_CONTRIBUTORS, "Max contributors reached");
        
        // Record commitment
        round.commitments[msg.sender] = commitment;
        round.hasCommitted[msg.sender] = true;
        round.contributors.push(msg.sender);
        round.totalContributors++;
        
        // Update contributor data
        ContributorData storage contributor = contributorData[msg.sender];
        contributor.totalContributions++;
        contributor.lastContribution = block.timestamp;
        
        // Check for new contributor
        if (contributor.totalContributions == 1) {
            totalContributors++;
            activeContributors++;
        }
        
        emit EntropyCommitted(currentRoundId, msg.sender, commitment, block.timestamp);
    }
    
    /**
     * @dev Reveal entropy for current round
     */
    function revealEntropy(bytes32 entropy, bytes32 salt) 
        external 
        nonReentrant 
        whenNotPaused 
        roundActive(currentRoundId)
        inRevealPhase(currentRoundId)
        notRevealed(currentRoundId, msg.sender)
    {
        require(randomnessRounds[currentRoundId].hasCommitted[msg.sender], "No commitment found");
        
        // Verify commitment
        bytes32 expectedCommitment = keccak256(abi.encodePacked(entropy, salt, msg.sender));
        require(
            expectedCommitment == randomnessRounds[currentRoundId].commitments[msg.sender],
            "Invalid entropy or salt"
        );
        
        RandomnessRound storage round = randomnessRounds[currentRoundId];
        
        // Record reveal
        round.hasRevealed[msg.sender] = true;
        
        // Add entropy to total
        round.totalEntropy = uint256(keccak256(abi.encodePacked(
            round.totalEntropy,
            entropy,
            msg.sender
        )));
        
        // Update contributor data
        ContributorData storage contributor = contributorData[msg.sender];
        contributor.successfulReveals++;
        contributor.reputation += 1;
        
        emit EntropyRevealed(currentRoundId, msg.sender, entropy, block.timestamp);
        
        // Check if round should be completed
        if (round.totalContributors >= MIN_CONTRIBUTORS) {
            _completeRound(currentRoundId);
        }
    }
    
    /**
     * @dev Complete round manually (owner only)
     */
    function completeRound(uint256 roundId) 
        external 
        onlyOwner 
        roundExists(roundId)
    {
        require(!randomnessRounds[roundId].isCompleted, "Round already completed");
        _completeRound(roundId);
    }
    
    /**
     * @dev Get current round info
     */
    function getCurrentRoundInfo() external view returns (
        uint256 roundId,
        uint256 startTime,
        uint256 commitPhaseEnd,
        uint256 revealPhaseEnd,
        bool isCompleted,
        uint256 _totalContributors,
        uint256 totalEntropy
    ) {
        RandomnessRound storage round = randomnessRounds[currentRoundId];
        return (
            round.roundId,
            round.startTime,
            round.commitPhaseEnd,
            round.revealPhaseEnd,
            round.isCompleted,
            round.totalContributors,
            round.totalEntropy
        );
    }
    
    /**
     * @dev Get round contributors
     */
    function getRoundContributors(uint256 roundId) 
        external 
        view 
        roundExists(roundId)
        returns (address[] memory)
    {
        return randomnessRounds[roundId].contributors;
    }
    
    /**
     * @dev Get contributor data
     */
    function getContributorData(address contributor) external view returns (ContributorData memory) {
        return contributorData[contributor];
    }
    
    /**
     * @dev Get final seed for round
     */
    function getFinalSeed(uint256 roundId) 
        external 
        view 
        roundExists(roundId)
        returns (bytes32)
    {
        require(randomnessRounds[roundId].isCompleted, "Round not completed");
        return randomnessRounds[roundId].finalSeed;
    }
    
    /**
     * @dev Blacklist/unblacklist contributor
     */
    function setContributorBlacklist(address contributor, bool blacklisted) external onlyOwner {
        blacklistedContributors[contributor] = blacklisted;
        contributorData[contributor].isBlacklisted = blacklisted;
        emit ContributorBlacklisted(contributor, blacklisted);
    }
    
    /**
     * @dev Update contributor reputation
     */
    function updateReputation(address contributor, uint256 newReputation) external onlyOwner {
        uint256 oldReputation = contributorData[contributor].reputation;
        contributorData[contributor].reputation = newReputation;
        emit ReputationUpdated(contributor, oldReputation, newReputation);
    }
    
    /**
     * @dev Emergency pause/unpause
     */
    function emergencyPause(bool pause) external onlyOwner {
        if (pause) {
            _pause();
        } else {
            _unpause();
        }
    }
    
    /**
     * @dev Generate random number from seed
     */
    function generateRandomNumber(bytes32 seed, uint256 maxValue) external view returns (uint256) {
        require(maxValue > 0, "Max value must be positive");
        return uint256(keccak256(abi.encodePacked(seed, block.timestamp))) % maxValue;
    }
    
    /**
     * @dev Internal function to complete round
     */
    function _completeRound(uint256 roundId) internal {
        RandomnessRound storage round = randomnessRounds[roundId];
        
        // Calculate final seed
        bytes32 finalSeed = keccak256(abi.encodePacked(
            round.totalEntropy,
            round.roundId,
            block.timestamp,
            block.prevrandao
        ));
        
        round.finalSeed = finalSeed;
        round.isCompleted = true;
        
        // Update global stats
        totalEntropyGenerated += round.totalEntropy;
        
        // Move to next round
        currentRoundId++;
        
        emit RoundCompleted(
            roundId,
            finalSeed,
            round.totalContributors,
            round.totalEntropy,
            block.timestamp
        );
    }
    
    /**
     * @dev Internal function to check if entropy is sufficient
     */
    function _isEntropySufficient(bytes32 entropy) internal pure returns (bool) {
        // Count non-zero bits in entropy
        uint256 nonZeroBits = 0;
        for (uint256 i = 0; i < 256; i++) {
            if (uint256(entropy) & (1 << i) != 0) {
                nonZeroBits++;
            }
        }
        
        return nonZeroBits >= MIN_ENTROPY_BITS;
    }
}
