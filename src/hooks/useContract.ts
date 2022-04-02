import {
  ARGENT_WALLET_DETECTOR_ADDRESS,
  ENS_REGISTRAR_ADDRESSES,
  GOVERNANCE_ALPHA_V0_ADDRESSES,
  GOVERNANCE_ALPHA_V1_ADDRESSES,
  MERKLE_DISTRIBUTOR_ADDRESS,
  MULTICALL_ADDRESS,
  NONFUNGIBLE_POSITION_MANAGER_ADDRESSES,
  QUOTER_ADDRESSES,
  V2_ROUTER_ADDRESS,
  V3_MIGRATOR_ADDRESSES,
} from 'constants/addresses'
import { ArgentWalletDetector, EnsPublicResolver, EnsRegistrar, Erc20, Weth } from '../abis/types'
import { NonfungiblePositionManager, Quoter, UniswapInterfaceMulticall } from 'types/v3'
import { UNI, WETH9_EXTENDED } from '../constants/tokens'

import ARGENT_WALLET_DETECTOR_ABI from 'abis/argent-wallet-detector.json'
import { Contract } from '@ethersproject/contracts'
import EIP_2612 from 'abis/eip_2612.json'
import ENS_ABI from 'abis/ens-registrar.json'
import ENS_PUBLIC_RESOLVER_ABI from 'abis/ens-public-resolver.json'
import ERC20_ABI from 'abis/erc20.json'
import ERC20_BYTES32_ABI from 'abis/erc20_bytes32.json'
import { abi as GOVERNANCE_ABI } from '@uniswap/governance/build/GovernorAlpha.json'
import { abi as IKibaSwapRelayerABI } from '../IKibaSwapRelayerABI.json'
import { abi as IUniswapV2PairABI } from '@uniswap/v2-core/build/IUniswapV2Pair.json'
import { abi as MERKLE_DISTRIBUTOR_ABI } from '@uniswap/merkle-distributor/build/MerkleDistributor.json'
import { abi as MulticallABI } from '@uniswap/v3-periphery/artifacts/contracts/lens/UniswapInterfaceMulticall.sol/UniswapInterfaceMulticall.json'
import { abi as NFTPositionManagerABI } from '@uniswap/v3-periphery/artifacts/contracts/NonfungiblePositionManager.sol/NonfungiblePositionManager.json'
import { abi as QuoterABI } from '@uniswap/v3-periphery/artifacts/contracts/lens/Quoter.sol/Quoter.json'
import { abi as STAKING_REWARDS_ABI } from '@uniswap/liquidity-staker/build/StakingRewards.json'
import { abi as UNI_ABI } from '@uniswap/governance/build/Uni.json'
import { abi as V2MigratorABI } from '@uniswap/v3-periphery/artifacts/contracts/V3Migrator.sol/V3Migrator.json'
import { V3Migrator } from 'types/v3/V3Migrator'
import WETH_ABI from 'abis/weth.json'
import { getContract } from 'utils'
import { useActiveWeb3React } from './web3'
import { useMemo } from 'react'
import { useWeb3React } from '@web3-react/core'

// returns null on errors
export function useContract<T extends Contract = Contract>(
  addressOrAddressMap: string | { [chainId: number]: string } | undefined,
  ABI: any,
  withSignerIfPossible = true
): T | null {
  const { library, account, chainId } = useActiveWeb3React()

  return useMemo(() => {
    if (!addressOrAddressMap || !ABI || !library || !chainId) return null
    let address: string | undefined
    if (typeof addressOrAddressMap === 'string') address = addressOrAddressMap
    else address = addressOrAddressMap[chainId]
    if (!address) return null
    try {
      return getContract(address, ABI, library, withSignerIfPossible && account ? account : undefined)
    } catch (error) {
      console.error('Failed to get contract', error)
      return null
    }
  }, [addressOrAddressMap, ABI, library, chainId, withSignerIfPossible, account]) as T
}

export function useV2MigratorContract() {
  return useContract<any>(V3_MIGRATOR_ADDRESSES, V2MigratorABI, true)
}

export function useTokenContract(tokenAddress?: string, withSignerIfPossible?: boolean) {
  return useContract<any>(tokenAddress, ERC20_ABI, withSignerIfPossible)
}

export function useWETHContract(withSignerIfPossible?: boolean) {
  const { chainId } = useActiveWeb3React()
  return useContract<any>(chainId ? WETH9_EXTENDED[chainId]?.address : undefined, WETH_ABI, withSignerIfPossible)
}

export function useArgentWalletDetectorContract() {
  return useContract<any>(ARGENT_WALLET_DETECTOR_ADDRESS, ARGENT_WALLET_DETECTOR_ABI, false)
}

export function useENSRegistrarContract(withSignerIfPossible?: boolean) {
  return useContract<any>(ENS_REGISTRAR_ADDRESSES, ENS_ABI, withSignerIfPossible)
}

export function useENSResolverContract(address: string | undefined, withSignerIfPossible?: boolean) {
  return useContract<any>(address, ENS_PUBLIC_RESOLVER_ABI, withSignerIfPossible)
}

export function useBytes32TokenContract(tokenAddress?: string, withSignerIfPossible?: boolean): Contract | null {
  return useContract(tokenAddress, ERC20_BYTES32_ABI, withSignerIfPossible)
}

export function useEIP2612Contract(tokenAddress?: string): Contract | null {
  return useContract(tokenAddress, EIP_2612, false)
}

export function usePairContract(pairAddress?: string, withSignerIfPossible?: boolean): Contract | null {
  return useContract(pairAddress, IUniswapV2PairABI, withSignerIfPossible)
}

export function useV2RouterContract(): Contract | null {
  const {chainId} = useWeb3React()
  const routerAddress = chainId ? V2_ROUTER_ADDRESS[chainId] : V2_ROUTER_ADDRESS[1];
  return useContract(routerAddress.toLowerCase(), IKibaSwapRelayerABI, true)
}

export function useMulticall2Contract() {
  return useContract<any>(MULTICALL_ADDRESS, MulticallABI, false) as UniswapInterfaceMulticall
}

export function useMerkleDistributorContract() {
  return useContract(MERKLE_DISTRIBUTOR_ADDRESS, MERKLE_DISTRIBUTOR_ABI, true)
}

export function useGovernanceV0Contract(): Contract | null {
  return useContract(GOVERNANCE_ALPHA_V0_ADDRESSES, GOVERNANCE_ABI, true)
}

export function useGovernanceV1Contract(): Contract | null {
  return useContract(GOVERNANCE_ALPHA_V1_ADDRESSES, GOVERNANCE_ABI, true)
}

export const useLatestGovernanceContract = useGovernanceV1Contract

export function useUniContract() {
  const { chainId } = useActiveWeb3React()
  return useContract(chainId ? UNI[chainId]?.address : undefined, UNI_ABI, true)
}

export function useStakingContract(stakingAddress?: string, withSignerIfPossible?: boolean) {
  return useContract(stakingAddress, STAKING_REWARDS_ABI, withSignerIfPossible)
}

export function useV3NFTPositionManagerContract(withSignerIfPossible?: boolean): NonfungiblePositionManager | null {
  return useContract<any>(
    NONFUNGIBLE_POSITION_MANAGER_ADDRESSES,
    NFTPositionManagerABI,
    withSignerIfPossible
  )
}

export function useV3Quoter() {
  return useContract<any>(QUOTER_ADDRESSES, QuoterABI)
}



export function useInterfaceMulticall() {
  return useContract<any>(MULTICALL_ADDRESS, MulticallABI, false) as UniswapInterfaceMulticall
}