// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title IPizzaParty
 * @dev Interface for Pizza Party contract to integrate with Chainlink VRF
 */
interface IPizzaParty {
    
    /**
     * @dev Process daily winners selected by VRF
     * @param gameId Current game ID
     * @param winners Array of selected winners
     */
    function processDailyWinners(uint256 gameId, address[] calldata winners) external;
    
    /**
     * @dev Process weekly winners selected by VRF
     * @param gameId Current game ID
     * @param winners Array of selected winners
     */
    function processWeeklyWinners(uint256 gameId, address[] calldata winners) external;
    
    /**
     * @dev Get eligible players for daily draw
     * @param gameId Current game ID
     * @return eligiblePlayers Array of eligible players
     */
    function getEligibleDailyPlayers(uint256 gameId) external view returns (address[] memory eligiblePlayers);
    
    /**
     * @dev Get eligible players for weekly draw
     * @param gameId Current game ID
     * @return eligiblePlayers Array of eligible players
     */
    function getEligibleWeeklyPlayers(uint256 gameId) external view returns (address[] memory eligiblePlayers);
    
    /**
     * @dev Get current game ID
     * @return gameId Current game ID
     */
    function getCurrentGameId() external view returns (uint256 gameId);
    
    /**
     * @dev Check if daily draw is ready
     * @return ready Whether daily draw is ready
     */
    function isDailyDrawReady() external view returns (bool ready);
    
    /**
     * @dev Check if weekly draw is ready
     * @return ready Whether weekly draw is ready
     */
    function isWeeklyDrawReady() external view returns (bool ready);
}
