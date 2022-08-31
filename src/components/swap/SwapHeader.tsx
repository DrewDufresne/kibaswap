import { RowBetween, RowFixed } from '../Row'

import { Info } from 'react-feather'
import { Percent } from '@uniswap/sdk-core'
import React from 'react'
import SettingsTab from '../Settings'
import { ShowSellTaxComponent } from 'components/ShowSellTax'
import { TYPE } from '../../theme'
import Tooltip from 'components/Tooltip'
import { TopTokenMovers } from './TopMovers'
import { Trans } from '@lingui/macro'
import styled from 'styled-components/macro'
import { useEthPrice } from 'state/logs/utils'
import { useWeb3React } from '@web3-react/core'

const StyledSwapHeader = styled.div`
  padding: 1rem 1.25rem 0.5rem 1.25rem;
  width: 100%;
  color: ${({ theme }) => theme.text2};
  border-bottom: 1px solid #444;
`

const HeaderType = styled(TYPE.black)`
font-family:'Open Sans';
&:hover {
  transition: all ease 0.2s;
  color:#F76C1D;
}
&:nth-of-type(2n+0) {
  padding-right:10px;
  border-right: 1px solid #444;
  &:hover{
    transition: all ease 0.1s;
  }
}
&:first-of-type{
  padding-right:10px;
  border-right:1px solid #444;
  &:hover{
    transition: all ease 0.1s;
  }
}`

export default function SwapHeader({ allowedSlippage, view, onViewChange,  }: { allowedSlippage: Percent, view: 'bridge' | 'swap' | 'limit' | 'flooz', onViewChange: (view: "bridge"  | "swap" | 'limit' | 'flooz') => void }) {
  const {chainId} = useWeb3React()
  const onBridgeClick = ( ) => onViewChange('bridge');
  const onLimitClick = ( ) => onViewChange('limit');
  const onSwapClick = ( ) => onViewChange('swap') 
  return (
    <StyledSwapHeader>
      <RowBetween>
        <RowFixed style={{gap: 10, display:'flex', alignItems:'center'}}>
          <HeaderType  onClick={onSwapClick} fontWeight={500} fontSize={22} style={{ color: view ==='swap' ? '#F76C1D' : '', textDecoration: view === 'swap' ? 'underline' : 'none', cursor: 'pointer'}}>
            <Trans>Swap</Trans>
          </HeaderType>
          
          {<HeaderType  onClick={onLimitClick} fontWeight={500} fontSize={22} style={{  color: view ==='limit' ? '#F76C1D' : '',textDecoration: view === 'limit' ? 'underline' : 'none', cursor: 'pointer'}}>
            <Trans>Limit</Trans>
          </HeaderType>}
                    
          {<HeaderType  onClick={onBridgeClick} fontWeight={500} fontSize={22} style={{ color: view ==='bridge' ? '#F76C1D' : '', textDecoration: view === 'bridge' ? 'underline' : 'none', cursor: 'pointer' }}>
            <Trans>Bridge</Trans>
          </HeaderType>}
    
        </RowFixed>
        {chainId === 1 && (
        <RowFixed>
          <SettingsTab placeholderSlippage={allowedSlippage} />
        </RowFixed>
        )}
      </RowBetween>
  </StyledSwapHeader>
  )
}
