# Smart Contract Documentation

## PizzaParty.sol

### Overview
The PizzaParty smart contract is a decentralized gaming platform on the Base network where players compete for daily and weekly jackpots using VMF tokens. The contract features a referral system, toppings rewards, and multi-platform wallet support.

### Security Features

#### ✅ ReentrancyGuard
- Prevents reentrancy attacks on all external functions
- Uses OpenZeppelin's battle-tested ReentrancyGuard implementation
- Applied to all functions that handle token transfers

#### ✅ Access Control
- Admin functions restricted to contract owner
- Only owner can draw winners, pause contract, blacklist players
- Emergency withdrawal function for contract owner only

#### ✅ Input Validation
- All inputs validated and sanitized
- Address validation for VMF token contract
- Referral code validation
- Balance checks before transfers

#### ✅ Emergency Controls
- Pause/unpause functionality for emergency situations
- Blacklist system to block malicious addresses
- Emergency withdrawal function for contract owner

#### ✅ Blacklist System
- Block malicious addresses from participating
- Owner can blacklist/unblacklist players
- Blacklisted players cannot enter games or receive rewards

### Game Mechanics

#### Daily Game
- **Entry Fee**: $1 VMF token per entry
- **Jackpot**: 100% of daily entry fees
- **Winners**: 8 random daily winners
- **Frequency**: One entry per wallet per day
- **Deadline**: Daily at 12pm PST

#### Weekly Jackpot
- **Prize Pool**: Total toppings claimed by all users
- **Funding**: Automatically from VMF token contract
- **Winners**: 10 random weekly winners
- **Deadline**: Monday 12pm PST

#### Toppings System
- **Daily Play**: 1 topping per day
- **VMF Holdings**: 2 toppings per 10 VMF
- **Referrals**: 2 toppings per accepted referral
- **7-Day Streak**: 3 toppings bonus

### Key Functions

#### Player Functions
```solidity
function enterDailyGame(string memory referralCode) external
```
- Enter the daily game with optional referral code
- Requires $1 VMF token balance
- Awards 1 topping for daily play
- Updates player streak

```solidity
function createReferralCode() external
```
- Create a unique referral code for the player
- Can only be created once per player
- Generates code based on player address and timestamp

```solidity
function awardVMFHoldingsToppings() external
```
- Award toppings based on VMF token holdings
- 2 toppings per 10 VMF tokens held
- Can be called multiple times

#### Admin Functions
```solidity
function drawDailyWinners() external onlyOwner
```
- Draw 8 random winners for daily game
- Distributes jackpot equally among winners
- Starts new daily game automatically

```solidity
function drawWeeklyWinners() external onlyOwner
```
- Draw 10 random winners for weekly game
- Distributes weekly jackpot equally
- Resets all player toppings

```solidity
function emergencyPause(bool pause) external onlyOwner
```
- Pause/unpause contract in emergency
- Prevents all game functions when paused

```solidity
function setPlayerBlacklist(address player, bool blacklisted) external onlyOwner
```
- Blacklist/unblacklist specific players
- Blacklisted players cannot participate

#### View Functions
```solidity
function hasEnteredToday(address player) public view returns (bool)
```
- Check if player has entered today's game

```solidity
function getPlayerInfo(address player) external view returns (Player memory)
```
- Get complete player information

```solidity
function getCurrentGame() external view returns (Game memory)
```
- Get current daily game information

### Data Structures

#### Player
```solidity
struct Player {
    uint256 totalToppings;      // Total toppings earned
    uint256 dailyEntries;       // Total daily game entries
    uint256 weeklyEntries;      // Total weekly game entries
    uint256 lastEntryTime;      // Timestamp of last entry
    uint256 streakDays;         // Current streak days
    uint256 lastStreakUpdate;   // Last streak update timestamp
    bool isBlacklisted;         // Blacklist status
}
```

#### Referral
```solidity
struct Referral {
    address referrer;           // Referrer address
    uint256 totalReferrals;     // Total successful referrals
    uint256 totalRewards;       // Total rewards earned
    bool isActive;              // Referral status
}
```

#### Game
```solidity
struct Game {
    uint256 gameId;             // Unique game identifier
    uint256 startTime;          // Game start timestamp
    uint256 endTime;            // Game end timestamp
    uint256 totalEntries;       // Total player entries
    uint256 jackpotAmount;      // Total jackpot amount
    address[] winners;          // Array of winner addresses
    bool isCompleted;           // Game completion status
}
```

### Events

#### Game Events
```solidity
event PlayerEntered(address indexed player, uint256 gameId, uint256 entryFee);
event DailyWinnersSelected(uint256 gameId, address[] winners, uint256 jackpotAmount);
event WeeklyWinnersSelected(uint256 gameId, address[] winners, uint256 jackpotAmount);
```

#### Reward Events
```solidity
event ToppingsAwarded(address indexed player, uint256 amount, string reason);
event ReferralCreated(address indexed referrer, string referralCode);
event ReferralUsed(address indexed referrer, address indexed newPlayer, uint256 reward);
```

#### Admin Events
```solidity
event PlayerBlacklisted(address indexed player, bool blacklisted);
event EmergencyPause(bool paused);
event JackpotUpdated(uint256 dailyJackpot, uint256 weeklyJackpot);
```

### Security Considerations

#### Reentrancy Protection
- All external functions use `nonReentrant` modifier
- Token transfers happen after state updates
- Follows checks-effects-interactions pattern

#### Access Control
- Owner functions protected by `onlyOwner` modifier
- Critical functions require owner privileges
- Emergency functions for contract management

#### Input Validation
- Address validation for all address inputs
- String validation for referral codes
- Balance checks before token operations

#### Emergency Procedures
- Pause functionality for emergency situations
- Blacklist system for malicious addresses
- Emergency withdrawal for contract owner

### Gas Optimization

#### Storage Optimization
- Packed structs to reduce storage costs
- Efficient mapping usage
- Minimal storage operations

#### Function Optimization
- Batch operations where possible
- Efficient loops and iterations
- Minimal external calls

### Deployment

#### Base Network Deployment
```bash
# Deploy to Base Sepolia testnet
npx hardhat run scripts/deploy.ts --network baseSepolia

# Deploy to Base mainnet
npx hardhat run scripts/deploy.ts --network base
```

#### Verification
```bash
# Verify on Basescan
npx hardhat verify --network base 0xCONTRACT_ADDRESS "0x2213414893259b0C48066Acd1763e7fbA97859E5"
```

### Testing

#### Test Coverage
```bash
# Run all tests
npx hardhat test

# Run security tests
npx hardhat test test/security/

# Run integration tests
npx hardhat test test/integration/

# Gas optimization tests
REPORT_GAS=true npx hardhat test
```

#### Test Categories
- ✅ Smart Contract Functions
- ✅ Security Features
- ✅ Wallet Integration
- ✅ Multi-platform Support
- ✅ Error Handling

### Monitoring

#### Contract Monitoring
- Daily jackpot tracking
- Weekly jackpot monitoring
- Referral activity tracking
- Gas usage patterns

#### Security Monitoring
- Suspicious transactions
- Blacklist management
- Emergency response procedures
- Vulnerability detection

### Bug Bounty

#### Reward Tiers
- **Critical**: $10,000 USD
- **High**: $5,000 USD
- **Medium**: $2,000 USD
- **Low**: $500 USD

#### Security Contact
- Email: vmf@vmfcoin.com
- GitHub Issues: [SECURITY] tag
- Discord: #security channel

### Audit Requirements

#### Smart Contract Audit
- Required before mainnet deployment
- Comprehensive security review
- Gas optimization analysis
- Formal verification

#### Frontend Security Review
- Regular security reviews
- Input validation testing
- Wallet integration testing
- Penetration testing

### License
MIT License - see LICENSE file for details.

---

🍕 Built with ❤️ for the Base community. Happy Pizza Partying! 🍕 