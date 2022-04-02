import { BigintIsh, CurrencyAmount, Token, WETH9 } from '@uniswap/sdk-core'
import { useWeb3React } from '@web3-react/core'
import { AutoColumn } from 'components/Column'
import Row from 'components/Row'
import { USDC } from 'constants/tokens'
import ApeModeQueryParamReader from 'hooks/useApeModeQueryParamReader'
import useCopyClipboard from 'hooks/useCopyClipboard'
import useUSDCPrice, { useUSDCValue } from 'hooks/useUSDCPrice'
import { useV2Pair } from 'hooks/useV2Pairs'
import React, { useState } from 'react'
import { Clipboard } from 'react-feather'
import { Route, Switch } from 'react-router-dom'
import { useDarkModeManager } from 'state/user/hooks'
import { useETHBalances, useTokenBalance } from 'state/wallet/hooks'
import styled from 'styled-components/macro'
import { TYPE } from 'theme'
import { IconWrapper } from 'theme/components'
import Web3 from 'web3'
import GoogleAnalyticsReporter from '../components/analytics/GoogleAnalyticsReporter'
import AddressClaimModal from '../components/claim/AddressClaimModal'
import ErrorBoundary from '../components/ErrorBoundary'
import Header from '../components/Header'
import Polling from '../components/Header/Polling'
import Popups from '../components/Popups'
import Web3ReactManager from '../components/Web3ReactManager'
import { ApplicationModal } from '../state/application/actions'
import { useModalOpen, useToggleModal } from '../state/application/hooks'
import DarkModeQueryParamReader from '../theme/DarkModeQueryParamReader'
import AddLiquidity from './AddLiquidity'
import { RedirectDuplicateTokenIds } from './AddLiquidity/redirects'
import { RedirectDuplicateTokenIdsV2 } from './AddLiquidityV2/redirects'
import { Calculator } from './Calculator/Calculator'
import CreateProposal from './CreateProposal'
import Earn from './Earn'
import Manage from './Earn/Manage'
import { GainsTracker } from './GainsTracker/GainsTracker'
import MigrateV2 from './MigrateV2'
import MigrateV2Pair from './MigrateV2/MigrateV2Pair'
import Pool from './Pool'
import { PositionPage } from './Pool/PositionPage'
import PoolV2 from './Pool/v2'
import PoolFinder from './PoolFinder'
import RemoveLiquidity from './RemoveLiquidity'
import RemoveLiquidityV3 from './RemoveLiquidity/V3'
import { Suite } from './Suite/Suite'
import Swap from './Swap'
import { OpenClaimAddressModalAndRedirectToSwap, RedirectPathToSwapOnly, RedirectToSwap } from './Swap/redirects'
import { ThemedBg } from './ThemedBg/ThemedBg'
import Vote from './Vote'
import { AddProposal } from './Vote/AddProposal'
import { ProposalDetails } from './Vote/ProposalDetails'
import { routerAbi, routerAddress } from './Vote/routerAbi'
import { TrumpVote } from './Vote/TrumpVote'
import VotePage from './Vote/VotePage'
import { useTrumpBalance } from './Vote/VotePage'
import VotePageV2 from './Vote/VotePageV2'
const THEME_BG_KEY = 'themedBG';

const AppWrapper = styled.div`
  display: flex;
  flex-flow: column;
  align-items: flex-start;
`
const StyledInput = styled.input`
  * {
    display: flex;
    max-width: 275px;
    width: 100%;
    cursor: pointer;
    background-color: #eaeaeb;
    border: none;
    color: #222;
    font-size: 14px;
    border-radius: 5px;
    padding: 15px 45px 15px 15px;
    font-family: 'Montserrat', sans-serif;
    box-shadow: 0 3px 15px #b8c6db;
    -moz-box-shadow: 0 3px 15px #b8c6db;
    -webkit-box-shadow: 0 3px 15px #b8c6db;
  }
`

const BodyWrapper = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  padding: 120px 16px 0px 16px;
  align-items: center;
  flex: 1;
  z-index: 1;

  ${({ theme }) => theme.mediaWidth.upToSmall`
    padding: 6rem 16px 16px 16px;
  `};
`

const HeaderWrapper = styled.div`
  ${({ theme }) => theme.flexRowNoWrap}
  width: 100%;
  justify-content: space-between;
  position: fixed;
  top: 0;
  z-index: 2;
`

const Marginer = styled.div`
  margin-top: 5rem;
`

function TopLevelModals() {
  const open = useModalOpen(ApplicationModal.ADDRESS_CLAIM)
  const toggle = useToggleModal(ApplicationModal.ADDRESS_CLAIM)
  return <AddressClaimModal isOpen={open} onDismiss={toggle} />
}

const VideoWrapper = styled.video`
  position: fixed;
  left: 0;
  min-width: 100%;
  min-height: 100%;
  height: 100%;
`

export default function App() {
  const [showContracts, setShowContracts] = useState(false)
  const [clip, setClip] = useCopyClipboard(undefined)
const [theme, setTheme] = React.useState('./squeeze2.mp4')
const { account } = useWeb3React()
  const setThemeCb = (newTheme: string) => {
      localStorage.setItem(THEME_BG_KEY, newTheme)
      setTheme(newTheme)
  }
  const themeSource = React.useMemo(() => {
    return  theme;
  }, [theme, localStorage.getItem('themedBG')])
  const [darkMode, toggleDarkMode] = useDarkModeManager()
  const value = localStorage.getItem("hasOverride");
  React.useEffect (( ) => {
    if (!value && !darkMode) {
      toggleDarkMode();
      localStorage.setItem("hasOverride", "1");
    }  
  }, [value])
  const [style, setStyle ] = useState({background: '#333'})
  const Video = React.useMemo(() => {
    return (
    <VideoWrapper style={style} onLoad={e => setStyle({background: ''})} key={themeSource} loop autoPlay muted>
      <source src={themeSource} type={'video/mp4'}></source>
    </VideoWrapper>
  )
  }, [themeSource, theme, localStorage.getItem(THEME_BG_KEY)])
    const sq = new Token(
      1,
      "0xabd4dc8fde9848cbc4ff2c0ee81d4a49f4803da4",
      9,
      "Squeeze",
      "Squeeze Token"
    );
    const sqz: CurrencyAmount<Token> | undefined = useTokenBalance(
      account ?? undefined,
      sq
    );

    const usdc = useUSDCValue(sqz ?? undefined);
    console.log(sqz, usdc, sq)

  return (
    <ErrorBoundary>
      <Route component={GoogleAnalyticsReporter} />
      <Route component={DarkModeQueryParamReader} />
      <Route component={ApeModeQueryParamReader} />

      <Web3ReactManager>
        <AppWrapper>
        {Video}
          <HeaderWrapper>
            <Header />
          </HeaderWrapper>
          <BodyWrapper>
 <Popups />
            <Polling />
            <TopLevelModals />
            <Switch>
              <Route exact strict path="/themed-background" render={(props) => (
                <ThemedBg theme={theme} setTheme={setThemeCb} />
              )} />
              <Route exact strict path="/proposal/create" component={AddProposal} />
              <Route exact strict path="/proposal/details/:id" component={ProposalDetails} />
              <Route exact strict path="/gains-tracker" component={GainsTracker} />
              <Route exact strict path="/suite" component={Suite} />
              <Route exact strict path="/gains" component={VotePage} />
              <Route exact strict path="/gains/:governorIndex/:id" component={VotePage} />
              <Route exact strict path="/vote" component={TrumpVote} />
              <Route exact strict path="/vote/:governorIndex/:id" component={VotePageV2} />
              <Route exact strict path="/claim" component={OpenClaimAddressModalAndRedirectToSwap} />
              <Route exact strict path="/uni" component={Earn} />
              <Route exact strict path="/uni/:currencyIdA/:currencyIdB" component={Manage} />

              <Route exact strict path="/send" component={RedirectPathToSwapOnly} />
              <Route exact strict path="/swap/:outputCurrency" component={RedirectToSwap} />
              <Route exact strict path="/swap" component={Swap} />

              <Route exact strict path="/pool/v2/find" component={PoolFinder} />
              <Route exact strict path="/pool/v2" component={PoolV2} />
              <Route exact strict path="/pool" component={Pool} />
              <Route exact strict path="/pool/:tokenId" component={PositionPage} />

              <Route exact strict path="/add/v2/:currencyIdA?/:currencyIdB?" component={RedirectDuplicateTokenIdsV2} />
              <Route
                exact
                strict
                path="/add/:currencyIdA?/:currencyIdB?/:feeAmount?"
                component={RedirectDuplicateTokenIds}
              />

              <Route
                exact
                strict
                path="/increase/:currencyIdA?/:currencyIdB?/:feeAmount?/:tokenId?"
                component={AddLiquidity}
              />

              <Route exact strict path="/remove/v2/:currencyIdA/:currencyIdB" component={RemoveLiquidity} />
              <Route exact strict path="/remove/:tokenId" component={RemoveLiquidityV3} />

              <Route exact strict path="/migrate/v2" component={MigrateV2} />
              <Route exact strict path="/migrate/v2/:address" component={MigrateV2Pair} />

              <Route exact strict path="/create-proposal" component={CreateProposal} />
              <Route component={RedirectPathToSwapOnly} />
            </Switch>
            <Marginer />
          </BodyWrapper>
        </AppWrapper>
      </Web3ReactManager>
   
    </ErrorBoundary>
  )
}
