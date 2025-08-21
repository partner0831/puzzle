import { useState, useCallback, useEffect } from 'react';
import { useAccount, useSigner } from 'wagmi';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESSES } from '../contract-config';
import { realTimeMetrics, GameMetrics } from '../services/real-time-metrics';

// Fee abstraction contract ABI
const FEE_ABSTRACTION_ABI = [
  'function sponsorGameEntry(address user, address gameContract, address referrer) external',
  'function getUserRemainingGasAllowance(address user) external view returns (uint256)',
  'function getDailyGasUsage(uint256 date) external view returns (uint256)'
];

export const useGaslessGame = () => {
  const { address } = useAccount();
  const { data: signer } = useSigner();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<GameMetrics | null>(null);
  const [gasAllowance, setGasAllowance] = useState<number>(0);
  const [canEnterGasless, setCanEnterGasless] = useState(false);

  // Initialize real-time metrics
  useEffect(() => {
    realTimeMetrics.addListener(setMetrics);
    realTimeMetrics.startMonitoring();

    return () => {
      realTimeMetrics.removeListener(setMetrics);
      realTimeMetrics.stopMonitoring();
    };
  }, []);

  // Check gas allowance
  const checkGasAllowance = useCallback(async () => {
    if (!address) return;

    try {
      const provider = new ethers.JsonRpcProvider('https://mainnet.base.org');
      const feeContract = new ethers.Contract(
        CONTRACT_ADDRESSES.PIZZA_PARTY_FEE_ABSTRACTION || '0x0000000000000000000000000000000000000000',
        FEE_ABSTRACTION_ABI,
        provider
      );

      const allowance = await feeContract.getUserRemainingGasAllowance(address);
      const allowanceNumber = Number(ethers.formatEther(allowance));
      
      setGasAllowance(allowanceNumber);
      setCanEnterGasless(allowanceNumber > 0);
    } catch (error) {
      console.error('Error checking gas allowance:', error);
      setCanEnterGasless(false);
    }
  }, [address]);

  // Enter game with gasless transaction
  const enterGameGasless = useCallback(async (referrer?: string) => {
    if (!address || !signer) {
      setError('Wallet not connected');
      return;
    }

    if (!canEnterGasless) {
      setError('No gas allowance remaining');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Create gasless transaction
      const gameContract = new ethers.Contract(
        CONTRACT_ADDRESSES.PIZZA_PARTY_CORE,
        ['function enterDailyGame(address referrer) external'],
        signer
      );

      // Prepare transaction data
      const referrerAddress = referrer || ethers.ZeroAddress;
      const data = gameContract.interface.encodeFunctionData('enterDailyGame', [referrerAddress]);

      // Create transaction object
      const tx = {
        to: CONTRACT_ADDRESSES.PIZZA_PARTY_CORE,
        data: data,
        value: ethers.parseEther('1'), // 1 VMF entry fee
        gasLimit: 150000
      };

      // Send transaction (gas will be sponsored)
      const transaction = await signer.sendTransaction(tx);
      
      // Wait for confirmation
      const receipt = await transaction.wait();
      
      console.log('✅ Gasless game entry successful:', receipt.hash);
      
      // Update gas allowance
      await checkGasAllowance();
      
      return receipt.hash;
    } catch (error: any) {
      console.error('❌ Gasless game entry failed:', error);
      
      if (error.code === 'ACTION_REJECTED') {
        setError('Transaction was rejected by user');
      } else if (error.code === 'INSUFFICIENT_FUNDS') {
        setError('Insufficient VMF balance for entry fee');
      } else if (error.message?.includes('already entered')) {
        setError('You have already entered today\'s game');
      } else {
        setError('Failed to enter game. Please try again.');
      }
      
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [address, signer, canEnterGasless, checkGasAllowance]);

  // Enter game with regular transaction (fallback)
  const enterGameRegular = useCallback(async (referrer?: string) => {
    if (!address || !signer) {
      setError('Wallet not connected');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const gameContract = new ethers.Contract(
        CONTRACT_ADDRESSES.PIZZA_PARTY_CORE,
        ['function enterDailyGame(address referrer) external'],
        signer
      );

      const referrerAddress = referrer || ethers.ZeroAddress;
      const tx = await gameContract.enterDailyGame(referrerAddress, {
        value: ethers.parseEther('1')
      });

      const receipt = await tx.wait();
      console.log('✅ Regular game entry successful:', receipt.hash);
      
      return receipt.hash;
    } catch (error: any) {
      console.error('❌ Regular game entry failed:', error);
      
      if (error.code === 'ACTION_REJECTED') {
        setError('Transaction was rejected by user');
      } else if (error.code === 'INSUFFICIENT_FUNDS') {
        setError('Insufficient balance for gas fees and entry');
      } else if (error.message?.includes('already entered')) {
        setError('You have already entered today\'s game');
      } else {
        setError('Failed to enter game. Please try again.');
      }
      
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [address, signer]);

  // Smart entry function (tries gasless first, falls back to regular)
  const enterGame = useCallback(async (referrer?: string) => {
    try {
      // Try gasless first
      if (canEnterGasless) {
        return await enterGameGasless(referrer);
      } else {
        // Fall back to regular transaction
        return await enterGameRegular(referrer);
      }
    } catch (error) {
      // If gasless fails, try regular
      if (canEnterGasless) {
        console.log('Gasless failed, trying regular transaction...');
        return await enterGameRegular(referrer);
      }
      throw error;
    }
  }, [canEnterGasless, enterGameGasless, enterGameRegular]);

  // Check daily entry status
  const checkDailyEntryStatus = useCallback(async () => {
    if (!address) return null;

    try {
      const provider = new ethers.JsonRpcProvider('https://mainnet.base.org');
      const gameContract = new ethers.Contract(
        CONTRACT_ADDRESSES.PIZZA_PARTY_CORE,
        ['function canEnterDailyGame(address player) external view returns (bool)'],
        provider
      );

      const canEnter = await gameContract.canEnterDailyGame(address);
      return canEnter;
    } catch (error) {
      console.error('Error checking daily entry status:', error);
      return false;
    }
  }, [address]);

  // Get user's topping count
  const getUserToppings = useCallback(async () => {
    if (!address) return 0;

    try {
      const provider = new ethers.JsonRpcProvider('https://mainnet.base.org');
      const gameContract = new ethers.Contract(
        CONTRACT_ADDRESSES.PIZZA_PARTY_CORE,
        ['function getPlayerToppings(address player) external view returns (uint256)'],
        provider
      );

      const toppings = await gameContract.getPlayerToppings(address);
      return Number(toppings);
    } catch (error) {
      console.error('Error getting user toppings:', error);
      return 0;
    }
  }, [address]);

  // Update gas allowance when address changes
  useEffect(() => {
    checkGasAllowance();
  }, [checkGasAllowance]);

  return {
    // State
    isLoading,
    error,
    metrics,
    gasAllowance,
    canEnterGasless,
    
    // Actions
    enterGame,
    enterGameGasless,
    enterGameRegular,
    checkDailyEntryStatus,
    getUserToppings,
    checkGasAllowance,
    
    // Utilities
    clearError: () => setError(null)
  };
};
