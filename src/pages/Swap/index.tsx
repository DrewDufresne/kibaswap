import { AlertOctagon, ArrowDown, ArrowLeft, CheckCircle, ChevronRight, HelpCircle, Info } from 'react-feather'
import { ApprovalState, useApproveCallbackFromTrade } from '../../hooks/useApproveCallback'
import { ArrowWrapper, Dots, SwapCallbackError, Wrapper } from '../../components/swap/styleds'
import Badge, { BadgeVariant } from 'components/Badge'
import { ButtonConfirmed, ButtonError, ButtonGray, ButtonLight, ButtonPrimary } from '../../components/Button'
import { Currency, CurrencyAmount, Percent, Token, TradeType } from '@uniswap/sdk-core'
import { DarkGreyCard, GreyCard } from '../../components/Card'
import { ExternalLink, ExternalLinkIcon, HideSmall, LinkStyledButton, StyledInternalLink, TYPE } from '../../theme'
import { Flex, Text } from 'rebass'
import { Link, RouteComponentProps, useParams } from 'react-router-dom'
import { MouseoverTooltip, MouseoverTooltipContent } from 'components/Tooltip'
import Row, { AutoRow, RowFixed } from '../../components/Row'
import { UseERC20PermitState, useERC20PermitFromTrade } from '../../hooks/useERC20Permit'
import styled, { ThemeContext } from 'styled-components/macro'
import { useAllTokens, useCurrency } from '../../hooks/Tokens'
import { useCallback, useContext, useEffect, useMemo, useState } from 'react'
import {
  useDefaultsFromURLSearch,
  useDerivedSwapInfo,
  useSwapActionHandlers,
  useSwapState,
} from '../../state/swap/hooks'
import { useExpertModeManager, useSetAutoSlippage, useSetUserSlippageTolerance, useUserSingleHopOnly } from '../../state/user/hooks'
import useToggledVersion, { Version } from '../../hooks/useToggledVersion'
import { useUSDCValue, useUSDCValueV2AndV3 } from '../../hooks/useUSDCPrice'
import useWrapCallback, { WrapType } from '../../hooks/useWrapCallback'

import AddressInputPanel from '../../components/AddressInputPanel'
import { AdvancedSwapDetails } from 'components/swap/AdvancedSwapDetails'
import AppBody from '../AppBody'
import { AutoColumn } from '../../components/Column'
import BetterTradeLink from '../../components/swap/BetterTradeLink'
import { ChartModal } from 'components/swap/ChartModal'
import ConfirmSwapModal from '../../components/swap/ConfirmSwapModal'
import CurrencyInputPanel from '../../components/CurrencyInputPanel'
import CurrencyLogo from '../../components/CurrencyLogo'
import { Field } from '../../state/swap/actions'
import JSBI from 'jsbi'
import { KibaNftAlert } from 'components/NetworkAlert/AddLiquidityNetworkAlert'
import { Layer2Prompt } from 'pages/Pool/v2'
import { LimitOrders } from 'state/transactions/hooks'
import Loader from '../../components/Loader'
import { ReactComponent as Majgic } from '../../assets/svg/arrows.svg'
import Marquee from "react-marquee-slider";
import Modal from 'components/Modal'
import React from 'react'
import ReactGA from 'react-ga'
import { ShowSellTaxComponent } from 'components/ShowSellTax'
import SwapHeader from '../../components/swap/SwapHeader'
import { SwitchLocaleLink } from '../../components/SwitchLocaleLink'
import TokenWarningModal from '../../components/TokenWarningModal'
import TradePrice from '../../components/swap/TradePrice'
import { Trans } from '@lingui/macro'
import UnsupportedCurrencyFooter from 'components/swap/UnsupportedCurrencyFooter'
import { Trade as V2Trade } from '@uniswap/v2-sdk'
import { Trade as V3Trade } from '@uniswap/v3-sdk'
import { V3TradeState } from '../../hooks/useBestV3Trade'
import { borderRadius } from 'polished'
import { computeFiatValuePriceImpact } from '../../utils/computeFiatValuePriceImpact'
import confirmPriceImpactWithoutFee from '../../components/swap/confirmPriceImpactWithoutFee'
import { getTokenTaxes } from 'pages/HoneyUtils'
import { getTradeVersion } from '../../utils/getTradeVersion'
import { isTradeBetter } from '../../utils/isTradeBetter'
import logo from '../../assets/images/download.png'
import { maxAmountSpend } from '../../utils/maxAmountSpend'
import { useActiveWeb3React } from '../../hooks/web3'
import useENSAddress from '../../hooks/useENSAddress'
import { useGelatoLimitOrders } from '@gelatonetwork/limit-orders-react'
import useIsArgentWallet from '../../hooks/useIsArgentWallet'
import { useIsSwapUnsupported } from '../../hooks/useIsSwapUnsupported'
import { useKiba } from 'pages/Vote/VotePage'
import { useSwapCallback } from '../../hooks/useSwapCallback'
import { useTokenData } from 'state/logs/utils'
import { useWalletModalToggle } from '../../state/application/hooks'
import { warningSeverity } from '../../utils/prices'

export const CardWrapper = styled(ExternalLink)`
  min-width: 190px;
  width:100%;
  margin-right: 16px;
  padding:3px;
  :hover {
    cursor: pointer;
    opacity: 0.6;
  }
`

const StyledInfo = styled(Info)`
  opacity: 0.4;
  color: ${({ theme }) => theme.text1};
  height: 16px;
  width: 16px;
  :hover {
    opacity: 0.8;
  }
`


export const FixedContainer = styled(AutoColumn)``

export const ScrollableRow = styled.div`
  display: flex;
  flex-direction: row;
  width: 100%;
  overflow-x: auto;
  white-space: nowrap;

  ::-webkit-scrollbar {
    display: none;
  }
`


export default function Swap({ history }: RouteComponentProps) {
  const params = useParams<{ tokenAddress?: string }>()
  const { account, chainId, library } = useActiveWeb3React()
  const isBinance = React.useMemo(() => chainId === 56, [chainId]);
  const tokenAddress = React.useMemo(() => isBinance && params.tokenAddress ? params.tokenAddress : undefined, [params.tokenAddress, isBinance])
  const binanceSwapURL = React.useMemo(() => isBinance ? `https://kibaswapbsc.app/#/swap?outputCurrency=${tokenAddress}` : undefined, [tokenAddress, isBinance])
  const loadedUrlParams = useDefaultsFromURLSearch()

  // token warning stuff
  const [loadedInputCurrency, loadedOutputCurrency] = [
    useCurrency(loadedUrlParams?.inputCurrencyId),
    useCurrency(loadedUrlParams?.outputCurrencyId),
  ]
  const [dismissTokenWarning, setDismissTokenWarning] = useState<boolean>(false)
  const urlLoadedTokens: Token[] = useMemo(
    () => [loadedInputCurrency, loadedOutputCurrency]?.filter((c): c is Token => c?.isToken ?? false) ?? [],
    [loadedInputCurrency, loadedOutputCurrency]
  )
  const handleConfirmTokenWarning = useCallback(() => {
    setDismissTokenWarning(true)
  }, [])

  // dismiss warning if all imported tokens are in active lists
  const defaultTokens = useAllTokens()
  const importTokensNotInDefault =
    urlLoadedTokens &&
    urlLoadedTokens.filter((token: Token) => {
      return !Boolean(token.address in defaultTokens)
    })

  const theme = useContext(ThemeContext)

  // toggle wallet when disconnected
  const toggleWalletModal = useWalletModalToggle()

  // for expert mode
  const [isExpertMode] = useExpertModeManager()

  // get version from the url
  const toggledVersion = useToggledVersion()

  // swap state
  const { independentField, typedValue, recipient, useOtherAddress } = useSwapState()
  const {
    v2Trade,
    v3TradeState: { trade: v3Trade, state: v3TradeState },
    toggledTrade: trade,
    allowedSlippage,
    currencyBalances,
    parsedAmount,
    currencies,
    inputError: swapInputError,
  } = useDerivedSwapInfo(toggledVersion)
  const {
    wrapType,
    execute: onWrap,
    inputError: wrapInputError,
  } = useWrapCallback(currencies[Field.INPUT], currencies[Field.OUTPUT], typedValue)
  const showWrap: boolean = wrapType !== WrapType.NOT_APPLICABLE
  const { address: recipientAddress } = useENSAddress(recipient)
  const [useAutoSlippage,] = useSetAutoSlippage()

  const parsedAmounts = useMemo(
    () =>
      showWrap
        ? {
          [Field.INPUT]: parsedAmount,
          [Field.OUTPUT]: parsedAmount,
        }
        : {
          [Field.INPUT]: independentField === Field.INPUT ? parsedAmount : trade?.inputAmount,
          [Field.OUTPUT]: independentField === Field.OUTPUT ? parsedAmount : trade?.outputAmount,
        },
    [independentField, parsedAmount, showWrap, trade]
  )
  const [automaticCalculatedSlippage, setAutomaticCalculatedSlippage] = React.useState(-1) 
  const setSlippage = useSetUserSlippageTolerance()
  React.useEffect(() => {
    const test = async () => {
    if (parsedAmounts.INPUT && 
        parsedAmounts.INPUT?.currency &&  
        parsedAmounts.OUTPUT && 
        useAutoSlippage && 
        parsedAmounts.OUTPUT?.currency && 
        library?.provider) {
        const address = !parsedAmounts?.OUTPUT?.currency?.isNative ? 
                      ((parsedAmounts.OUTPUT.currency as any).address ? 
                      (parsedAmounts?.OUTPUT?.currency as any).address : 
                      (parsedAmounts.OUTPUT.currency.wrapped).address) as string
                       : !parsedAmounts?.INPUT?.currency?.isNative ? 
                       ((parsedAmounts?.INPUT?.currency as any).address ? 
                       (parsedAmounts?.INPUT?.currency as any).address :
                        (parsedAmounts.INPUT.currency.wrapped).address) as string : 
                       ''
        console.log(address)
        getTokenTaxes(address, library?.provider).then((taxes) => {
          let value:number | null = parsedAmounts?.INPUT?.currency.isNative ? 
          ((taxes?.buy ?? 0) + 1) : parsedAmounts?.OUTPUT?.currency.isNative ? 
          taxes.sell : 0;
          if (value) value += 3
        const parsed = Math.floor(Number.parseFloat((value ?? '0').toString()) * 100)
        console.log('auto calculated and parsed', parsed)
        if (automaticCalculatedSlippage !== parsed) {
          setSlippage(new Percent(parsed, 10_000))
          setAutomaticCalculatedSlippage(value as number)
        }
      })
    }
  }
  test()
  }, [
    parsedAmounts.OUTPUT, 
    parsedAmounts.INPUT, 
    library, 
    useAutoSlippage
  ])

  const fiatValueInput = useUSDCValueV2AndV3(parsedAmounts[Field.INPUT])
  const fiatValueOutput = useUSDCValueV2AndV3(parsedAmounts[Field.OUTPUT])
  const priceImpact = computeFiatValuePriceImpact(fiatValueInput as any, fiatValueOutput as any)
  const { onSwitchTokens, onCurrencySelection, onUserInput, onChangeRecipient, onSwitchUseChangeRecipient } = useSwapActionHandlers()
  const isValid = !swapInputError
  const dependentField: Field = independentField === Field.INPUT ? Field.OUTPUT : Field.INPUT

  const handleTypeInput = useCallback(
    (value: string) => {
      onUserInput(Field.INPUT, value)
    },    
    [onUserInput]
  )
  const handleTypeOutput = useCallback(
    (value: string) => {
      onUserInput(Field.OUTPUT, value)
    },
    [onUserInput]
  )

  // reset if they close warning without tokens in params
  const handleDismissTokenWarning = useCallback(() => {
    setDismissTokenWarning(true)
    history.push('/swap/')
  }, [history])

  // modal and loading
  const [{ showConfirm, tradeToConfirm, swapErrorMessage, attemptingTxn, txHash }, setSwapState] = useState<{
    showConfirm: boolean
    tradeToConfirm: V2Trade<Currency, Currency, TradeType> | V3Trade<Currency, Currency, TradeType> | undefined
    attemptingTxn: boolean
    swapErrorMessage: string | undefined
    txHash: string | undefined
  }>({
    showConfirm: false,
    tradeToConfirm: undefined,
    attemptingTxn: false,
    swapErrorMessage: undefined,
    txHash: undefined,
  })

  const formattedAmounts = {
    [independentField]: typedValue,
    [dependentField]: showWrap
      ? parsedAmounts[independentField]?.toExact() ?? ''
      : parsedAmounts[dependentField]?.toSignificant(6) ?? '',
  }

  const userHasSpecifiedInputOutput = Boolean(
    currencies[Field.INPUT] && currencies[Field.OUTPUT] && parsedAmounts[independentField]?.greaterThan(JSBI.BigInt(0))
  )
  const routeNotFound = !trade?.route
  const isLoadingRoute = toggledVersion === Version.v3 && V3TradeState.LOADING === v3TradeState

  // check whether the user has approved the router on the input token
  const [approvalState, approveCallback] = useApproveCallbackFromTrade(trade, allowedSlippage)
  const {
    state: signatureState,
    signatureData,
    gatherPermitSignature,
  } = useERC20PermitFromTrade(trade, allowedSlippage)
  const handleApprove = useCallback(async () => {
    if (signatureState === UseERC20PermitState.NOT_SIGNED && gatherPermitSignature) {
      try {
        await gatherPermitSignature()
      } catch (error) {
        // try to approve if gatherPermitSignature failed for any reason other than the user rejecting it
        if (error?.code !== 4001) {
          await approveCallback()
        }
      }
    } else {
      await approveCallback()
    }
  }, [approveCallback, gatherPermitSignature, signatureState])

  // check if user has gone through approval process, used to show two step buttons, reset on token change
  const [approvalSubmitted, setApprovalSubmitted] = useState<boolean>(false)

  // mark when a user has submitted an approval, reset onTokenSelection for input field
  useEffect(() => {
    if (approvalState === ApprovalState.PENDING) {
      setApprovalSubmitted(true)
    }
  }, [approvalState, approvalSubmitted])

  const maxInputAmount: CurrencyAmount<Currency> | undefined = maxAmountSpend(currencyBalances[Field.INPUT])
  const showMaxButton = Boolean(maxInputAmount?.greaterThan(0) && !parsedAmounts[Field.INPUT]?.equalTo(maxInputAmount))

  // the callback to execute the swap
  const { callback: swapCallback, error: swapCallbackError } = useSwapCallback(
    trade,
    allowedSlippage,
    recipient,
    signatureData
  )

  const [singleHopOnly] = useUserSingleHopOnly()

  const handleSwap = useCallback(() => {
    if (!swapCallback) {
      return
    }
    if (priceImpact && !confirmPriceImpactWithoutFee(priceImpact)) {
      return
    }
    setSwapState({ attemptingTxn: true, tradeToConfirm, showConfirm: !isExpertMode, swapErrorMessage: undefined, txHash: undefined })
    swapCallback()
      .then((hash) => {
        setSwapState({ attemptingTxn: false, tradeToConfirm, showConfirm: !isExpertMode, swapErrorMessage: undefined, txHash: hash })
        ReactGA.event({
          category: 'Swap',
          action:
            recipient === null
              ? 'Swap w/o Send'
              : (recipientAddress ?? recipient) === account
                ? 'Swap w/o Send + recipient'
                : 'Swap w/ Send',
          label: [
            trade?.inputAmount?.currency?.symbol,
            trade?.outputAmount?.currency?.symbol,
            getTradeVersion(trade),
            singleHopOnly ? 'SH' : 'MH',
          ].join('/'),
        })
      })
      .catch((error) => {
        setSwapState({
          attemptingTxn: false,
          tradeToConfirm,
          showConfirm,
          swapErrorMessage: error.message,
          txHash: undefined,
        })
      })
  }, [
    swapCallback,
    priceImpact,
    tradeToConfirm,
    showConfirm,
    recipient,
    recipientAddress,
    account,
    trade,
    singleHopOnly,
  ])

  // errors
  const [showInverted, setShowInverted] = useState<boolean>(false)

  // warnings on the greater of fiat value price impact and execution price impact
  const priceImpactSeverity = useMemo(() => {
    const executionPriceImpact = trade?.priceImpact
    return warningSeverity(
      executionPriceImpact && priceImpact
        ? executionPriceImpact.greaterThan(priceImpact)
          ? executionPriceImpact
          : priceImpact
        : executionPriceImpact ?? priceImpact
    )
  }, [priceImpact, trade])

  const isArgentWallet = useIsArgentWallet()

  // show approve flow when: no error on inputs, not approved or pending, or approved in current session
  // never show if price impact is above threshold in non expert mode
  const showApproveFlow =
    !isArgentWallet &&
    !swapInputError &&
    (approvalState === ApprovalState.NOT_APPROVED ||
      approvalState === ApprovalState.PENDING ||
      (approvalSubmitted && approvalState === ApprovalState.APPROVED)) &&
    !(priceImpactSeverity > 3 && !isExpertMode)

  const handleConfirmDismiss = useCallback(() => {
    setSwapState({ showConfirm: false, tradeToConfirm, attemptingTxn, swapErrorMessage, txHash })
    // if there was a tx hash, we want to clear the input
    if (txHash) {
      onUserInput(Field.INPUT, '')
    }
  }, [attemptingTxn, onUserInput, swapErrorMessage, tradeToConfirm, txHash])

  const handleAcceptChanges = useCallback(() => {
    setSwapState({ tradeToConfirm: trade, swapErrorMessage, txHash, attemptingTxn, showConfirm })
  }, [attemptingTxn, showConfirm, swapErrorMessage, trade, txHash])

  const handleInputSelect = useCallback(
    (inputCurrency) => {
      setApprovalSubmitted(false) // reset 2 step UI for approvals
      onCurrencySelection(Field.INPUT, inputCurrency)
    },
    [onCurrencySelection]
  )
  const [showChart, setShowChart] = React.useState(false)
  const tokenData = useTokenData((currencies[Field.OUTPUT] as any)?.address ?? '')

  const handleMaxInput = useCallback(() => {
    maxInputAmount && onUserInput(Field.INPUT, maxInputAmount.toExact())
  }, [maxInputAmount, onUserInput])

  const handleOutputSelect = useCallback(
    (outputCurrency) => {
      onCurrencySelection(Field.OUTPUT, outputCurrency)
    },
    [onCurrencySelection, tokenData]
  )

  const floozUrl = React.useMemo(() => {
    let retVal = 'https://www.flooz.trade/embedded/0x005d1123878fc55fbd56b54c73963b234a64af3c/?backgroundColor=transparent&refId=I56v2c&chainId=1'
    if (chainId === 56) {
      retVal = 'https://www.flooz.trade/embedded/0xc3afde95b6eb9ba8553cdaea6645d45fb3a7faf5/?backgroundColor=transparent&refId=I56v2c'
    } 
    return retVal;
  },[chainId])

  const kibaBalance = useKiba(account)

  const swapIsUnsupported = useIsSwapUnsupported(currencies?.INPUT, currencies?.OUTPUT)

  const priceImpactTooHigh = priceImpactSeverity > 3 && !isExpertMode
  const [view, setView] = React.useState<'bridge' | 'swap' | 'flooz' |
    'limit'
  >('swap')
  const StyledDiv = styled.div`
  font-family: 'Bangers', cursive;
  font-size:32px;
  `
  const cannotUseFeature = !account || (!kibaBalance) || (+kibaBalance?.toFixed(0) <= 0)
  const increaseRef = React.useRef<HTMLDivElement>(null)
  // const [pauseAnimation, setPauseAnimation] = useState(false)
  // const [resetInterval, setClearInterval] = useState<() => void | undefined>()
  const resetToStepTwo = () => {
    setApprovalSubmitted(false) // reset 2 step UI for approvals
    onSwitchTokens()
  };

  const removeSend = () => {
    onChangeRecipient('')
    onSwitchUseChangeRecipient(false)
  };
  const onDismiss = () => setShowChart(false);
  const swapBtnClick = () => {
    if (isExpertMode) {
      handleSwap()
    } else {
      setSwapState({
        tradeToConfirm: trade,
        attemptingTxn: false,
        swapErrorMessage: undefined,
        showConfirm: true,
        txHash: undefined,
      })
    }
  }
const toggleShowChart = () => setShowChart(!showChart)
  const onViewChangeFn = (view:any) => setView(view)
  const items = [{ title: "Kiba Inu", img: "https://kiba.app/static/media/download.cfc6b4d1.png", text: "Kiba Inu is a token infused with Kiba Swap" }, { title: "Swally Inu", img: "https://kiba.app/static/media/download.cfc6b4d1.png", text: "Learn more" }, { title: "KIBA INU", img: "https://kiba.app/static/media/download.cfc6b4d1.png", text: "Learn more" }, { title: "Jabba Inu", img: "https://kiba.app/static/media/download.cfc6b4d1.png", text: "Jabba Inu is a meme coin offering culture to its holders." }];
  return (
    <>
      <TokenWarningModal
        isOpen={importTokensNotInDefault.length > 0 && !dismissTokenWarning}
        tokens={importTokensNotInDefault}
        onConfirm={handleConfirmTokenWarning}
        onDismiss={handleDismissTokenWarning}
      />
    
      <AppBody style={{ marginTop: 0, paddingTop: 0, position: 'relative', minWidth: '45%', maxWidth: view === 'bridge' ? 690 : 480 }}>
        <SwapHeader view={view} onViewChange={onViewChangeFn} allowedSlippage={allowedSlippage} />
        {!isBinance && (
          <>
         
            {view === 'swap' && <Wrapper id="swap-page">
         
              <ConfirmSwapModal
                isOpen={showConfirm}
                trade={trade}
                originalTrade={tradeToConfirm}
                onAcceptChanges={handleAcceptChanges}
                attemptingTxn={attemptingTxn}
                txHash={txHash}
                recipient={recipient}
                allowedSlippage={allowedSlippage}
                onConfirm={handleSwap}
                swapErrorMessage={swapErrorMessage}
                onDismiss={handleConfirmDismiss}
              />

              <AutoColumn gap={'xs'}>
              {useAutoSlippage && automaticCalculatedSlippage >= 0 && <Badge  variant={BadgeVariant.DEFAULT}>
          Using {automaticCalculatedSlippage}% Auto Slippage</Badge>}
                <div style={{ display: 'relative' }}>
                  <CurrencyInputPanel
                    label={
                      independentField === Field.OUTPUT && !showWrap ? <Trans>From (at most)</Trans> : <Trans>From</Trans>
                    }
                    value={formattedAmounts[Field.INPUT]}
                    showMaxButton={showMaxButton}
                    currency={currencies[Field.INPUT]}
                    onUserInput={handleTypeInput}
                    onMax={handleMaxInput}
                    fiatValue={fiatValueInput ?? undefined}
                    onCurrencySelect={handleInputSelect}
                    otherCurrency={currencies[Field.OUTPUT]}
                    showOnlyTrumpCoins={true}
                    showCommonBases={true}
                    hideBalance={false}
                    hideInput={false}
                    
                    id="swap-currency-input"
                  />
                  <ArrowWrapper clickable>
                    < Majgic 
                      
                      onClick={resetToStepTwo}  
                    />
                  </ArrowWrapper>
                  <CurrencyInputPanel
                    value={formattedAmounts[Field.OUTPUT]}
                    onUserInput={handleTypeOutput}
                    label={independentField === Field.INPUT && !showWrap ? <Trans>To (at least)</Trans> : <Trans>To</Trans>}
                    showMaxButton={false}
                    hideBalance={false}
                    showOnlyTrumpCoins={true}
                    fiatValue={fiatValueOutput ?? undefined}
                    priceImpact={priceImpact}
                    currency={currencies[Field.OUTPUT]}
                    onCurrencySelect={handleOutputSelect}
                    otherCurrency={currencies[Field.INPUT]}
                    showCommonBases={true}
                    id="swap-currency-output"
                  />
                </div>

                {!cannotUseFeature && useOtherAddress && !showWrap ? (
                  <>
                    <AutoRow justify="space-between" style={{ padding: '0 1rem' }}>
                      <ArrowWrapper clickable={false}>
                        <ArrowDown size="16" color={theme.text2} />
                      </ArrowWrapper>
                      <LinkStyledButton id="remove-recipient-button" onClick={removeSend}>
                        <Trans>- Remove send</Trans>
                      </LinkStyledButton>
                    </AutoRow>
                    <AddressInputPanel id="recipient" value={recipient as string} onChange={onChangeRecipient} />
                  </>
                ) : null}

                {!!cannotUseFeature && useOtherAddress && !showWrap && (
                  <AutoRow justify="space-between" style={{ padding: '0 1rem' }}>
                    <p>You must own Kiba Inu tokens to use the <Badge>Swap to Receiver</Badge> feature.</p>
                  </AutoRow>
                )}

                {showWrap ? null : (
                  <Row style={{ justifyContent: !trade ? 'center' : 'space-between' }}>
                    <RowFixed style={{ padding: '5px 0px' }}>
                      {[V3TradeState.VALID, V3TradeState.SYNCING, V3TradeState.NO_ROUTE_FOUND].includes(v3TradeState) &&
                        (toggledVersion === Version.v3 && isTradeBetter(v3Trade, v2Trade) ? (
                          <BetterTradeLink version={Version.v2} otherTradeNonexistent={!v3Trade} />
                        ) : toggledVersion === Version.v2 && isTradeBetter(v2Trade, v3Trade) ? (
                          <BetterTradeLink version={Version.v3} otherTradeNonexistent={!v2Trade} />
                        ) : (
                          toggledVersion === Version.v2 && (
                            <ButtonGray
                              width="fit-content"
                              padding="0.1rem 0.5rem 0.1rem 0.35rem"
                              as={Link}
                              to="/swap"
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                height: '24px',
                                lineHeight: '120%',
                                marginLeft: '0.75rem',
                              }}
                            >
                              <ArrowLeft color={theme.text3} size={12} /> &nbsp;
                              <TYPE.main style={{ lineHeight: '120%' }} fontSize={12}>
                                <Trans>
                                  <HideSmall>Back to </HideSmall>
                                  V3
                                </Trans>
                              </TYPE.main>
                            </ButtonGray>
                          )
                        ))}

                      {toggledVersion === Version.v3 && trade && isTradeBetter(v2Trade, v3Trade) && (
                        <ButtonGray
                          width="fit-content"
                          padding="0.1rem 0.5rem"
                          disabled
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            height: '24px',
                            opacity: 0.8,
                            marginLeft: '0.25rem',
                          }}
                        >
                          <TYPE.black fontSize={12}>
                            <Trans>V3</Trans>
                          </TYPE.black>
                        </ButtonGray>
                      )}
                    </RowFixed>
                    {trade ? (
                      <RowFixed>
                        <TradePrice
                          price={trade.executionPrice}
                          showInverted={showInverted}
                          setShowInverted={setShowInverted}
                        />
                        <MouseoverTooltipContent
                          content={<AdvancedSwapDetails trade={trade} allowedSlippage={allowedSlippage} />}
                        >
                          <StyledInfo />
                        </MouseoverTooltipContent>
                      </RowFixed>
                    ) : null}
                  </Row>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  {currencies[Field.OUTPUT] && currencies[Field.OUTPUT]?.name === 'Kiba Inu' && window.location.href.includes('swap') && <p style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }} onClick={toggleShowChart}>{showChart ? 'Hide' : 'Show'} Chart <ChevronRight /></p>}
                  <Modal onDismiss={onDismiss} isOpen={showChart && !!currencies[Field.OUTPUT]?.name && (currencies[Field.OUTPUT]?.name as string) === 'Kiba Inu'}>
                    {!cannotUseFeature && <ChartModal onDismiss={onDismiss} isOpen={showChart && !!currencies[Field.OUTPUT]?.name && (currencies[Field.OUTPUT]?.name as string) === 'Kiba Inu'} />}
                    {cannotUseFeature && <div style={{ padding: '3rem 6rem', display: 'flex', flexFlow: 'row wrap' }}>
                      <AlertOctagon /> You must hold Kiba Inu tokens to use this feature.
                    </div>}
                  </Modal>
                  {[currencies[Field.OUTPUT], currencies[Field.INPUT]].some(curr => curr?.name === 'Kiba Inu') && <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  </div>}
                </div>

                <div>
                  {swapIsUnsupported ? (
                    <ButtonPrimary style={{ marginTop: 15 }} disabled={true}>
                      <TYPE.main mb="4px">
                        <Trans>Unsupported Asset</Trans>
                      </TYPE.main>
                    </ButtonPrimary>
                  ) : !account ? (
                    <ButtonLight style={{ marginTop: 20 }} onClick={toggleWalletModal}>
                      <Trans>Connect Wallet</Trans>
                    </ButtonLight>
                  ) : showWrap ? (
                    <ButtonPrimary style={{ marginTop: 20 }} disabled={Boolean(wrapInputError)} onClick={onWrap}>
                      {wrapInputError ??
                        (wrapType === WrapType.WRAP ? (
                          <Trans>Wrap</Trans>
                        ) : wrapType === WrapType.UNWRAP ? (
                          <Trans>Unwrap</Trans>
                        ) : null)}
                    </ButtonPrimary>
                  ) : routeNotFound && userHasSpecifiedInputOutput ? (
                    <GreyCard style={{ textAlign: 'center' }}>
                      <TYPE.main mb="4px">
                        {isLoadingRoute ? (
                          <Dots>
                            <Trans>Loading</Trans>
                          </Dots>
                        ) : singleHopOnly ? (
                          <Trans>Insufficient liquidity for this trade. Try enabling multi-hop trades.</Trans>
                        ) : (
                          <Trans>Insufficient liquidity for this trade.</Trans>
                        )}
                      </TYPE.main>
                    </GreyCard>
                  ) : showApproveFlow ? (
                    <AutoRow style={{ flexWrap: 'nowrap', width: '100%' }}>
                      <AutoColumn style={{ width: '100%' }} gap="12px">
                        <ButtonConfirmed
                          style={{ marginTop: 15 }}
                          onClick={handleApprove}
                          width="100%"
                          disabled={
                            approvalState !== ApprovalState.NOT_APPROVED ||
                            approvalSubmitted ||
                            signatureState === UseERC20PermitState.SIGNED
                          }
                          altDisabledStyle={approvalState === ApprovalState.PENDING} // show solid button while waiting
                          confirmed={
                            approvalState === ApprovalState.APPROVED || signatureState === UseERC20PermitState.SIGNED
                          }
                        >
                          <AutoRow justify="space-between" style={{ flexWrap: 'nowrap' }}>
                            <span style={{ display: 'flex-grow:1', alignItems: 'center' }}>
                              <CurrencyLogo
                                currency={currencies[Field.INPUT]}
                                size={'20px'}
                                style={{ marginRight: '8px', flexShrink: 0 }}
                              />
                              {/* we need to shorten this string on mobile */}
                              {approvalState === ApprovalState.APPROVED || signatureState === UseERC20PermitState.SIGNED ? (
                                <Trans>You can now trade {currencies[Field.INPUT]?.symbol}</Trans>
                              ) : (
                                <>Enable {currencies[Field.INPUT]?.symbol}</>
                              )}
                            </span>
                            {approvalState === ApprovalState.PENDING ? (
                              <Loader stroke="white" />
                            ) : (approvalSubmitted && approvalState === ApprovalState.APPROVED) ||
                              signatureState === UseERC20PermitState.SIGNED ? (
                              <CheckCircle size="20" color={theme.green1} />
                            ) : (
                              <MouseoverTooltip
                                text={
                                  <Trans>
                                    You must give the Uniswap smart contracts permission to use your{' '}
                                    {currencies[Field.INPUT]?.symbol}. You only have to do this once per token.
                                  </Trans>
                                }
                              >
                                <HelpCircle size="20" color={'white'} style={{ marginLeft: '8px' }} />
                              </MouseoverTooltip>
                            )}
                          </AutoRow>
                        </ButtonConfirmed>
                        <ButtonError style={{ marginTop: 15 }}
                          onClick={swapBtnClick}
                          width="100%"
                          id="swap-button"
                          disabled={
                            !isValid ||
                            (approvalState !== ApprovalState.APPROVED && signatureState !== UseERC20PermitState.SIGNED) ||
                            priceImpactTooHigh
                          }
                          error={isValid && priceImpactSeverity > 2}
                        >
                          <Text fontSize={16} fontWeight={500}>
                            {priceImpactTooHigh ? (
                              <Trans>High Price Impact</Trans>
                            ) : priceImpactSeverity > 2 ? (
                              <Trans>Swap Anyway</Trans>
                            ) : (
                              <Trans>Swap</Trans>
                            )}
                          </Text>
                        </ButtonError>
                      </AutoColumn>
                    </AutoRow>
                  ) : (
                    <ButtonError style={{ marginTop: 15 }}
                      onClick={swapBtnClick}
                      id="swap-button"
                      disabled={!isValid || priceImpactTooHigh || !!swapCallbackError}
                      error={isValid && priceImpactSeverity > 2 && !swapCallbackError}
                    >
                      <Text fontSize={20} fontWeight={500}>
                        {swapInputError ? (
                          swapInputError
                        ) : priceImpactTooHigh ? (
                          <Trans>Price Impact Too High</Trans>
                        ) : priceImpactSeverity > 2 ? (
                          <Trans>Swap Anyway</Trans>
                        ) : (
                          <Trans>Swap</Trans>
                        )}
                      </Text>
                    </ButtonError>
                  )}
                  {isExpertMode && swapErrorMessage ? <SwapCallbackError error={swapErrorMessage} /> : null}

                </div>
              </AutoColumn>
            </Wrapper>}


          </>
        )
        }
        {view === 'bridge' && (
          <Wrapper id="bridgepage">
            <AutoColumn>
              <iframe style={{ maxWidth: 750, width: '100%', height: 520, border: '1px solid #7b3744', borderRadius: 30 }} src="https://kiba-inu-bridgev2.netlify.app/"></iframe>
            </AutoColumn>
          </Wrapper>
        )}
        {view === 'flooz' && <Wrapper>
          <iframe style={{backgroundColor:'bg0', display: 'flex', justifyContent: 'center', border: '1px solid transparent', borderRadius: 30, height: 600, width: '100%' }} src={floozUrl} />
            
          </Wrapper>}
        {view === 'limit' &&
          <Wrapper>
            <LimitOrders />
          </Wrapper>}
        {!!isBinance && view === 'swap' && binanceSwapURL && <iframe style={{ display: 'flex', justifyContent: 'center', border: '1px solid transparent', borderRadius: 30, height: 800, width: '100%' }} src={binanceSwapURL} />}
      </AppBody>

      
      <SwitchLocaleLink />
      {!swapIsUnsupported ? null : (
        <UnsupportedCurrencyFooter show={swapIsUnsupported} currencies={[currencies.INPUT, currencies.OUTPUT]} />
      )}

    </>
  )
}
