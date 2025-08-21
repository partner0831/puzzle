// Dependency injection container
import { ErrorHandler } from '@/lib/error-handler'
import { SecurityMonitor } from '@/lib/security-monitor'
import { GameService, IGameService, IContractService, ISecurityService } from '@/lib/services/game-service'
import { WalletService, IWalletService } from '@/lib/services/wallet-service'
import { PrizeService, IPrizeService } from '@/lib/services/prize-service'
import { ReferralService, IReferralService } from '@/lib/services/referral-service'
import { ContractService } from '@/lib/services/contract-service'

export interface ServiceContainer {
  gameService: IGameService
  walletService: IWalletService
  prizeService: IPrizeService
  referralService: IReferralService
  contractService: IContractService
  securityService: ISecurityService
  errorHandler: ErrorHandler
}

class Container implements ServiceContainer {
  private static instance: Container
  private _gameService?: IGameService
  private _walletService?: IWalletService
  private _prizeService?: IPrizeService
  private _referralService?: IReferralService
  private _contractService?: IContractService
  private _securityService?: ISecurityService
  private _errorHandler?: ErrorHandler

  static getInstance(): Container {
    if (!Container.instance) {
      Container.instance = new Container()
    }
    return Container.instance
  }

  // Lazy initialization of services
  get gameService(): IGameService {
    if (!this._gameService) {
      this._gameService = new GameService(
        this.contractService,
        this.securityService,
        this.errorHandler
      )
    }
    return this._gameService
  }

  get walletService(): IWalletService {
    if (!this._walletService) {
      this._walletService = new WalletService(
        this.securityService,
        this.errorHandler
      )
    }
    return this._walletService
  }

  get prizeService(): IPrizeService {
    if (!this._prizeService) {
      this._prizeService = new PrizeService(
        this.contractService,
        this.securityService,
        this.errorHandler
      )
    }
    return this._prizeService
  }

  get referralService(): IReferralService {
    if (!this._referralService) {
      this._referralService = new ReferralService(
        this.securityService,
        this.errorHandler
      )
    }
    return this._referralService
  }

  get contractService(): IContractService {
    if (!this._contractService) {
      this._contractService = new ContractService()
    }
    return this._contractService
  }

  get securityService(): ISecurityService {
    if (!this._securityService) {
      this._securityService = SecurityMonitor.getInstance()
    }
    return this._securityService
  }

  get errorHandler(): ErrorHandler {
    if (!this._errorHandler) {
      this._errorHandler = ErrorHandler.getInstance()
    }
    return this._errorHandler
  }

  // Reset all services (useful for testing)
  reset(): void {
    this._gameService = undefined
    this._walletService = undefined
    this._prizeService = undefined
    this._referralService = undefined
    this._contractService = undefined
    this._securityService = undefined
    this._errorHandler = undefined
  }

  // Initialize all services
  initialize(): void {
    // Force initialization of all services
    this.gameService
    this.walletService
    this.prizeService
    this.referralService
    this.contractService
    this.securityService
    this.errorHandler
  }
}

// Export singleton instance
export const container = Container.getInstance()

// Helper function to get container
export const getContainer = (): ServiceContainer => container

// Helper function to reset container (mainly for testing)
export const resetContainer = (): void => container.reset()

// Helper function to initialize container
export const initializeContainer = (): void => container.initialize() 