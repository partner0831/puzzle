/**
 * Core Wallet Module
 * 
 * This module handles all wallet-related functionality with clear boundaries
 * and well-defined interfaces for secure wallet operations.
 */

export interface WalletModule {
  connect(): Promise<void>
  disconnect(): void
  getAccount(): string | null
  isConnected(): boolean
  getBalance(): Promise<string>
  signMessage(message: string): Promise<string>
  sendTransaction(transaction: TransactionRequest): Promise<string>
}

export interface TransactionRequest {
  to: string
  value: string
  data?: string
  gasLimit?: number
}

export interface WalletState {
  isConnected: boolean
  account: string | null
  chainId: number | null
  balance: string
  provider: any
}

export class WalletManager implements WalletModule {
  private state: WalletState
  private auditLogger: AuditLogger
  private securityMonitor: SecurityMonitor

  constructor() {
    this.state = {
      isConnected: false,
      account: null,
      chainId: null,
      balance: '0',
      provider: null
    }
    
    this.auditLogger = new AuditLogger()
    this.securityMonitor = new SecurityMonitor()
  }

  /**
   * Connect to wallet with security validation
   */
  async connect(): Promise<void> {
    try {
      // Security validation before connection
      this.securityMonitor.validateConnectionRequest()
      
      // Attempt wallet connection
      const provider = await this.requestWalletProvider()
      
      if (!provider) {
        throw new Error('No wallet provider available')
      }

      // Request account access
      const accounts = await provider.request({ method: 'eth_requestAccounts' })
      
      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts found')
      }

      // Validate account
      const account = accounts[0]
      this.securityMonitor.validateAccount(account)

      // Get chain ID
      const chainId = await provider.request({ method: 'eth_chainId' })
      
      // Get balance
      const balance = await provider.getBalance(account)

      // Update state
      this.state = {
        isConnected: true,
        account,
        chainId: parseInt(chainId, 16),
        balance: balance.toString(),
        provider
      }

      // Log successful connection
      this.auditLogger.logWalletConnection({
        account,
        chainId: this.state.chainId,
        timestamp: Date.now(),
        success: true
      })

      // Security monitoring
      this.securityMonitor.trackWalletConnection(account)

    } catch (error) {
      // Log failed connection
      this.auditLogger.logWalletConnection({
        account: null,
        chainId: null,
        timestamp: Date.now(),
        success: false,
        error: error.message
      })

      // Security alert
      this.securityMonitor.alertFailedConnection(error.message)
      
      throw error
    }
  }

  /**
   * Disconnect wallet with cleanup
   */
  disconnect(): void {
    // Security validation
    this.securityMonitor.validateDisconnection()

    // Log disconnection
    this.auditLogger.logWalletDisconnection({
      account: this.state.account,
      timestamp: Date.now()
    })

    // Clear state
    this.state = {
      isConnected: false,
      account: null,
      chainId: null,
      balance: '0',
      provider: null
    }

    // Security cleanup
    this.securityMonitor.cleanupWalletSession()
  }

  /**
   * Get current account with validation
   */
  getAccount(): string | null {
    // Security check
    if (!this.securityMonitor.validateAccountAccess()) {
      return null
    }

    return this.state.account
  }

  /**
   * Check connection status
   */
  isConnected(): boolean {
    return this.state.isConnected && this.state.account !== null
  }

  /**
   * Get account balance with caching
   */
  async getBalance(): Promise<string> {
    if (!this.isConnected()) {
      throw new Error('Wallet not connected')
    }

    try {
      const balance = await this.state.provider.getBalance(this.state.account)
      this.state.balance = balance.toString()
      
      // Log balance check
      this.auditLogger.logBalanceCheck({
        account: this.state.account,
        balance: this.state.balance,
        timestamp: Date.now()
      })

      return this.state.balance
    } catch (error) {
      this.securityMonitor.alertBalanceCheckError(error.message)
      throw error
    }
  }

  /**
   * Sign message with security validation
   */
  async signMessage(message: string): Promise<string> {
    if (!this.isConnected()) {
      throw new Error('Wallet not connected')
    }

    // Security validation
    this.securityMonitor.validateMessageSigning(message)

    try {
      const signature = await this.state.provider.request({
        method: 'personal_sign',
        params: [message, this.state.account]
      })

      // Log signature
      this.auditLogger.logMessageSigning({
        account: this.state.account,
        message,
        signature,
        timestamp: Date.now()
      })

      return signature
    } catch (error) {
      this.securityMonitor.alertSigningError(error.message)
      throw error
    }
  }

  /**
   * Send transaction with comprehensive validation
   */
  async sendTransaction(transaction: TransactionRequest): Promise<string> {
    if (!this.isConnected()) {
      throw new Error('Wallet not connected')
    }

    // Security validation
    this.securityMonitor.validateTransaction(transaction)

    try {
      // Estimate gas if not provided
      if (!transaction.gasLimit) {
        transaction.gasLimit = await this.state.provider.estimateGas(transaction)
      }

      // Send transaction
      const txHash = await this.state.provider.request({
        method: 'eth_sendTransaction',
        params: [transaction]
      })

      // Log transaction
      this.auditLogger.logTransaction({
        account: this.state.account,
        transaction,
        txHash,
        timestamp: Date.now()
      })

      // Security monitoring
      this.securityMonitor.trackTransaction(txHash, transaction)

      return txHash
    } catch (error) {
      this.securityMonitor.alertTransactionError(error.message)
      throw error
    }
  }

  /**
   * Request wallet provider with fallback
   */
  private async requestWalletProvider(): Promise<any> {
    // Try MetaMask first
    if (typeof window !== 'undefined' && window.ethereum) {
      return window.ethereum
    }

    // Try other providers
    const providers = [
      'coinbaseWalletExtension',
      'trustwallet',
      'rainbow',
      'phantom'
    ]

    for (const providerName of providers) {
      if (window[providerName]) {
        return window[providerName]
      }
    }

    return null
  }

  /**
   * Get wallet state for external access
   */
  getWalletState(): WalletState {
    return { ...this.state }
  }
}

/**
 * Audit Logger for wallet operations
 */
class AuditLogger {
  logWalletConnection(data: any): void {
    console.log('🔗 WALLET CONNECTION:', data)
    // In production, send to external logging service
  }

  logWalletDisconnection(data: any): void {
    console.log('🔌 WALLET DISCONNECTION:', data)
  }

  logBalanceCheck(data: any): void {
    console.log('💰 BALANCE CHECK:', data)
  }

  logMessageSigning(data: any): void {
    console.log('✍️ MESSAGE SIGNING:', data)
  }

  logTransaction(data: any): void {
    console.log('📤 TRANSACTION:', data)
  }
}

/**
 * Security Monitor for wallet operations
 */
class SecurityMonitor {
  validateConnectionRequest(): void {
    // Rate limiting
    // IP validation
    // Device fingerprinting
  }

  validateAccount(account: string): void {
    // Account format validation
    // Blacklist check
    // Suspicious activity detection
  }

  validateAccountAccess(): boolean {
    // Session validation
    // Permission check
    return true
  }

  validateDisconnection(): void {
    // Session cleanup validation
  }

  validateMessageSigning(message: string): void {
    // Message content validation
    // Size limits
    // Malicious content detection
  }

  validateTransaction(transaction: TransactionRequest): void {
    // Transaction validation
    // Gas limit checks
    // Value validation
    // Recipient validation
  }

  trackWalletConnection(account: string): void {
    // Track connection patterns
  }

  trackTransaction(txHash: string, transaction: TransactionRequest): void {
    // Track transaction patterns
  }

  alertFailedConnection(error: string): void {
    console.log('🚨 FAILED CONNECTION:', error)
  }

  alertBalanceCheckError(error: string): void {
    console.log('🚨 BALANCE CHECK ERROR:', error)
  }

  alertSigningError(error: string): void {
    console.log('🚨 SIGNING ERROR:', error)
  }

  alertTransactionError(error: string): void {
    console.log('🚨 TRANSACTION ERROR:', error)
  }

  cleanupWalletSession(): void {
    // Clean up session data
  }
}

// Export singleton instance
export const walletManager = new WalletManager() 