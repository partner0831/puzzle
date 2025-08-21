import { useState, useEffect, useCallback } from 'react'
import { AdvancedContractsService } from '@/lib/services/advanced-contracts-service'
import { ethers } from 'ethers'

export function useAdvancedContracts() {
  const [service, setService] = useState<AdvancedContractsService | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Initialize service when window.ethereum is available
  useEffect(() => {
    if (typeof window !== 'undefined' && window.ethereum) {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum)
        const advancedService = new AdvancedContractsService(provider)
        setService(advancedService)
        setError(null)
      } catch (err) {
        console.error('Failed to initialize AdvancedContractsService:', err)
        setError('Failed to initialize contract service')
      }
    }
  }, [])

  // Get service with signer for transactions
  const getServiceWithSigner = useCallback(async () => {
    if (!window.ethereum) return null
    
    try {
      const provider = new ethers.BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()
      return new AdvancedContractsService(provider, signer)
    } catch (err) {
      console.error('Failed to get service with signer:', err)
      return null
    }
  }, [])

  // Core game functions
  const enterDailyGame = useCallback(async () => {
    if (!service) throw new Error('Service not initialized')
    setIsLoading(true)
    setError(null)
    
    try {
      const serviceWithSigner = await getServiceWithSigner()
      if (!serviceWithSigner) throw new Error('Failed to get signer')
      
      const result = await serviceWithSigner.enterDailyGame()
      return result
    } catch (err: any) {
      setError(err.message || 'Failed to enter daily game')
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [service, getServiceWithSigner])

  const getCurrentGameId = useCallback(async () => {
    if (!service) throw new Error('Service not initialized')
    return await service.getCurrentGameId()
  }, [service])

  const getDailyJackpot = useCallback(async () => {
    if (!service) throw new Error('Service not initialized')
    return await service.getDailyJackpotFormatted()
  }, [service])

  const getWeeklyJackpot = useCallback(async () => {
    if (!service) throw new Error('Service not initialized')
    return await service.getWeeklyJackpotFormatted()
  }, [service])

  const getPlayerToppings = useCallback(async (address: string) => {
    if (!service) throw new Error('Service not initialized')
    return await service.getPlayerToppings(address)
  }, [service])

  const isDailyDrawReady = useCallback(async () => {
    if (!service) throw new Error('Service not initialized')
    return await service.isDailyDrawReady()
  }, [service])

  const isWeeklyDrawReady = useCallback(async () => {
    if (!service) throw new Error('Service not initialized')
    return await service.isWeeklyDrawReady()
  }, [service])

  // Referral functions
  const createReferralCode = useCallback(async () => {
    if (!service) throw new Error('Service not initialized')
    setIsLoading(true)
    setError(null)
    
    try {
      const serviceWithSigner = await getServiceWithSigner()
      if (!serviceWithSigner) throw new Error('Failed to get signer')
      
      const result = await serviceWithSigner.createReferralCode()
      return result
    } catch (err: any) {
      setError(err.message || 'Failed to create referral code')
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [service, getServiceWithSigner])

  const processReferralCode = useCallback(async (referralCode: string) => {
    if (!service) throw new Error('Service not initialized')
    setIsLoading(true)
    setError(null)
    
    try {
      const serviceWithSigner = await getServiceWithSigner()
      if (!serviceWithSigner) throw new Error('Failed to get signer')
      
      const result = await serviceWithSigner.processReferralCode(referralCode)
      return result
    } catch (err: any) {
      setError(err.message || 'Failed to process referral code')
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [service, getServiceWithSigner])

  // Dynamic pricing functions
  const getCurrentEntryFee = useCallback(async () => {
    if (!service) throw new Error('Service not initialized')
    return await service.getCurrentEntryFeeFormatted()
  }, [service])

  const getVMFPrice = useCallback(async () => {
    if (!service) throw new Error('Service not initialized')
    return await service.getVMFPriceFormatted()
  }, [service])

  // Loyalty functions
  const getUserLoyaltyData = useCallback(async (address: string) => {
    if (!service) throw new Error('Service not initialized')
    return await service.getUserLoyaltyData(address)
  }, [service])

  const redeemPoints = useCallback(async (address: string, points: number) => {
    if (!service) throw new Error('Service not initialized')
    setIsLoading(true)
    setError(null)
    
    try {
      const serviceWithSigner = await getServiceWithSigner()
      if (!serviceWithSigner) throw new Error('Failed to get signer')
      
      const result = await serviceWithSigner.redeemPoints(address, points)
      return result
    } catch (err: any) {
      setError(err.message || 'Failed to redeem points')
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [service, getServiceWithSigner])

  // Weekly challenges functions
  const getUserChallengeData = useCallback(async (address: string) => {
    if (!service) throw new Error('Service not initialized')
    return await service.getUserChallengeData(address)
  }, [service])

  const joinChallenge = useCallback(async (challengeId: number) => {
    if (!service) throw new Error('Service not initialized')
    setIsLoading(true)
    setError(null)
    
    try {
      const serviceWithSigner = await getServiceWithSigner()
      if (!serviceWithSigner) throw new Error('Failed to get signer')
      
      const result = await serviceWithSigner.joinChallenge(challengeId)
      return result
    } catch (err: any) {
      setError(err.message || 'Failed to join challenge')
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [service, getServiceWithSigner])

  const completeChallenge = useCallback(async (challengeId: number) => {
    if (!service) throw new Error('Service not initialized')
    setIsLoading(true)
    setError(null)
    
    try {
      const serviceWithSigner = await getServiceWithSigner()
      if (!serviceWithSigner) throw new Error('Failed to get signer')
      
      const result = await serviceWithSigner.completeChallenge(challengeId)
      return result
    } catch (err: any) {
      setError(err.message || 'Failed to complete challenge')
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [service, getServiceWithSigner])

  return {
    service,
    isLoading,
    error,
    // Core game functions
    enterDailyGame,
    getCurrentGameId,
    getDailyJackpot,
    getWeeklyJackpot,
    getPlayerToppings,
    isDailyDrawReady,
    isWeeklyDrawReady,
    // Referral functions
    createReferralCode,
    processReferralCode,
    // Dynamic pricing functions
    getCurrentEntryFee,
    getVMFPrice,
    // Loyalty functions
    getUserLoyaltyData,
    redeemPoints,
    // Weekly challenges functions
    getUserChallengeData,
    joinChallenge,
    completeChallenge,
  }
}
