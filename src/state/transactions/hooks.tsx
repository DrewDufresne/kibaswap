import { TransactionResponse } from '@ethersproject/providers'
import { useWeb3React } from '@web3-react/core'
import Badge, { BadgeVariant } from 'components/Badge'
import { DarkCard } from 'components/Card'
import { Wrapper } from 'components/swap/styleds'
import moment from 'moment'
import { isHoneyPot } from 'pages/App'
import { LoadingRows } from 'pages/Pool/styleds'
import { useKiba } from 'pages/Vote/VotePage'
import React from 'react'
import { useCallback, useMemo } from 'react'
import { AlertCircle, CheckCircle, ChevronDown, ChevronUp, DollarSign, HelpCircle, Info, Loader, RefreshCcw } from 'react-feather'
import { useAppDispatch, useAppSelector } from 'state/hooks'
import styled from 'styled-components/macro'
import ThemeProvider, { ExternalLink, ExternalLinkIcon, StyledInternalLink } from 'theme'
import { useActiveWeb3React } from '../../hooks/web3'
import { addTransaction } from './actions'
import './limit.css'
import { TransactionDetails } from './reducer'
import { orderBy } from 'lodash'
import useInterval from 'hooks/useInterval'
import Tooltip from 'components/Tooltip'
import { useContractOwner } from 'components/swap/ConfirmSwapModal'
import { isHoneyPotBsc } from 'pages/HoneyPotBsc'
import { GelatoLimitOrderPanel, GelatoLimitOrdersHistoryPanel, GelatoProvider } from '@gelatonetwork/limit-orders-react'
import * as axios from 'axios'
import { getTaxesForBscToken, getTokenTaxes } from 'pages/HoneyUtils'
import Swal from 'sweetalert2'
import { fetchBscTokenData, useBnbPrices, useBscTokenData } from 'state/logs/bscUtils'
import { getTokenData, useEthPrice } from 'state/logs/utils'
// helper that can take a ethers library transaction response and add it to the list of transactions
export function useTransactionAdder(): (
  response: TransactionResponse,
  customData?: { summary?: string; approval?: { tokenAddress: string; spender: string }; claim?: { recipient: string } }
) => void {
  const { chainId, account, library } = useActiveWeb3React()
  const dispatch = useAppDispatch()

  return useCallback(
    (
      response: TransactionResponse,
      {
        summary,
        approval,
        claim,
      }: { summary?: string; claim?: { recipient: string }; approval?: { tokenAddress: string; spender: string } } = {}
    ) => {
      if (!account) return
      if (!chainId) return

      const { hash } = response
      if (!hash) {
        throw Error('No transaction hash found.')
      }
      dispatch(addTransaction({ hash, from: account, chainId, approval, summary, claim }))
    },
    [dispatch, chainId, account]
  )
}

// returns all the transactions for the current chain
export function useAllTransactions(): { [txHash: string]: TransactionDetails } {
  const { chainId } = useActiveWeb3React()

  const state = useAppSelector((state) => state.transactions)

  return chainId ? state[chainId] ?? {} : {}
}

export function useTransaction(transactionHash?: string): TransactionDetails | undefined {
  const allTransactions = useAllTransactions()

  if (!transactionHash) {
    return undefined
  }

  return allTransactions[transactionHash]
}

export function useIsTransactionPending(transactionHash?: string): boolean {
  const transactions = useAllTransactions()

  if (!transactionHash || !transactions[transactionHash]) return false

  return !transactions[transactionHash].receipt
}

export function useIsTransactionConfirmed(transactionHash?: string): boolean {
  const transactions = useAllTransactions()

  if (!transactionHash || !transactions[transactionHash]) return false

  return Boolean(transactions[transactionHash].receipt)
}

/**
 * Returns whether a transaction happened in the last day (86400 seconds * 1000 milliseconds / second)
 * @param tx to check for recency
 */
export function isTransactionRecent(tx: TransactionDetails): boolean {
  return new Date().getTime() - tx.addedTime < 86_400_000
}

// returns whether a token has a pending approval transaction
export function useHasPendingApproval(tokenAddress: string | undefined, spender: string | undefined): boolean {
  const allTransactions = useAllTransactions()
  return useMemo(
    () =>
      typeof tokenAddress === 'string' &&
      typeof spender === 'string' &&
      Object.keys(allTransactions).some((hash) => {
        const tx = allTransactions[hash]
        if (!tx) return false
        if (tx.receipt) {
          return false
        } else {
          const approval = tx.approval
          if (!approval) return false
          return approval.spender === spender && approval.tokenAddress === tokenAddress && isTransactionRecent(tx)
        }
      }),
    [allTransactions, spender, tokenAddress]
  )
}

// watch for submissions to claim
// return null if not done loading, return undefined if not found
export function useUserHasSubmittedClaim(account?: string): {
  claimSubmitted: boolean
  claimTxn: TransactionDetails | undefined
} {
  const allTransactions = useAllTransactions()

  // get the txn if it has been submitted
  const claimTxn = useMemo(() => {
    const txnIndex = Object.keys(allTransactions).find((hash) => {
      const tx = allTransactions[hash]
      return tx.claim && tx.claim.recipient === account
    })
    return txnIndex && allTransactions[txnIndex] ? allTransactions[txnIndex] : undefined
  }, [account, allTransactions])

  return { claimSubmitted: Boolean(claimTxn), claimTxn }
}



export const LimitOrders = () => {
  const { chainId, account, library } = useWeb3React();
  const isBinance = React.useMemo(() => chainId && chainId === 56, [chainId]);
  const src = React.useMemo(() =>
    isBinance ? 'https://cashewnutz.github.io/flape/index.html' : 'https://cashewnutz.github.io/flap/index.html', [isBinance])
  return <>
    <GelatoLimitOrderPanel />
    <GelatoLimitOrdersHistoryPanel />
  </>
}

interface NewToken {
  network: string;
  symbol: string;
  name: string;
  addr: string;
  timestamp: string;
  safe?: boolean;
  buyTax?: number | null;
  sellTax?: number | null;
  liquidity?:any;
}

const StyledDiv = styled.div`
  font-family:"Bangers",cursive;
  font-size:18px;
`

const Table = styled.table`
&:before {
  background: linear-gradient(to right,red,orange)
}
td:last-child {
  font-size:12px;
}
th {
  padding-top: 12px;
  padding-bottom: 12px;
  text-align: left;
  color: white;
  &:before {
    background: linear-gradient(to right,red,orange)
  }
}
border-collapse: collapse;
border: 1px solid 
width:100%;
tr:nth-child(even){background: radial-gradient(rgb(255 0 0 / 50%),rgb(136 24 5))}
td, th {
  border: 1px solid #ddd;
  padding: 8px;
}`

const ContractOwner = ({ address }: { address: string }) => {
  const owner = useContractOwner(address)

  return (
    <Badge>{owner}</Badge>
  )
}

export const FomoPage = () => {
  const { chainId, account, library } = useWeb3React();
  const [data, setData] = React.useState<NewToken[]>()
  const networkDefaultValue = React.useMemo(() =>
    chainId === 1 ? 'eth' : chainId === 56 ? 'bsc' : 'eth'
    , [chainId]);
  const [network, setNetwork] = React.useState<'bsc' | 'eth' | 'poly' | 'ftm' | 'kcc' | 'avax'>(networkDefaultValue)
  const authHeader = {
    headers: {
      Authorization: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJuYW1lIjoic3BhY2VtYW5fbGl2ZXMiLCJpYXQiOjE2Mzc1NDg1NTUsImV4cCI6MTY3NDcwMDU1NX0.b_O-i7Srfv1tEYOMGiea9DQ7S9x9tq7Azq1LSwylHUY`
    }
  }
  const [page, setPage] = React.useState(1);
  const AMT_PER_PAGE = 25;
  const [searchValue, setSearchValue] = React.useState('')
  const [flagSafe, setFlagSafe] = React.useState(false)

  const pagedData = React.useMemo(() => {
    if (!data) return [];
    let sorted = data?.filter(a => searchValue ? a?.addr?.toLowerCase().includes(searchValue.toLowerCase()) || a.name?.toLowerCase().includes(searchValue?.toLowerCase()) || a?.symbol.toLowerCase().includes(searchValue?.toLowerCase()) : true)
    if (flagSafe) sorted = sorted.filter(i => !!i.safe)
    const startIndex = page * AMT_PER_PAGE - AMT_PER_PAGE;
    const endIndex = startIndex + AMT_PER_PAGE;
    return sorted.slice(startIndex, endIndex);
  }, [page, data, searchValue, flagSafe])

  React.useEffect(() => {
    if (data?.length && pagedData.some(i => i.safe === undefined))
      flagAllCallback(pagedData.filter(item => item.safe === undefined))
  }, [pagedData, data])

  const bnbPrice = useBnbPrices()

  const getPaginationGroup = () => {
    if (!data?.length) return []
    let sorted = data?.filter(a => searchValue ? a?.addr?.toLowerCase().includes(searchValue.toLowerCase()) || a.name?.toLowerCase().includes(searchValue?.toLowerCase()) || a?.symbol.toLowerCase().includes(searchValue?.toLowerCase()) : true)
    if (flagSafe) sorted = sorted?.filter(item => item?.safe === true)
    const start = Math.floor((page - 1) / AMT_PER_PAGE) * AMT_PER_PAGE;
    const pages = sorted.length / AMT_PER_PAGE;
    const retVal = [];
    for (let i = 1; i <= pages; i++) {
      retVal.push(i);
    }
    return retVal.length === 0 ? [1] : retVal;
  };

React.useEffect(() => {
  if (data && 
      !data?.every(a => a.safe !== undefined)
    ) 
    flagAllCallback(data?.filter(a => a?.safe === undefined))
}, [data])

  const [ethPrice, ethPriceOld] = useEthPrice()
  const [lastFetched, setLastFetched] = React.useState<Date | undefined>()
  const flagAllCallback = React.useCallback(async (items: any[]) => {
    try {
      if (!items?.length || !library?.provider) return;
      let safe: any[] = [];
      if (flagSafe) {
          safe = await Promise.all((data ?? [])?.filter(item => item.safe === undefined).map(async item => {
            const isHoneyPotFn = network === 'bsc' ? getTaxesForBscToken : item.network?.toLowerCase() === 'eth' ? getTokenTaxes : (add: string) => Promise.resolve({ honeypot: false, buy: null, sell: null });
            const isSafe = await isHoneyPotFn(item.addr, library?.provider)
           
            return {
            ...item,
            safe: !isSafe.honeypot,
            buyTax: isSafe?.buy,
            sellTax: isSafe?.sell,
          }
        })) as Array<NewToken>;

        const alreadyFlagged = data?.filter(i => i.safe !== undefined);
        setData([...safe.concat(alreadyFlagged)])
      } else {
        safe = await Promise.all(items?.map(async item => {
          console.log(item.network)
          //const tokenDataFn = item.network?.toLowerCase() === 'bsc' ? fetchBscTokenData : item?.network?.toLowerCase() === 'eth' ?  getTokenData : (add: string, p1: any, p2:any) => ({totalLiquidity: undefined});
          const isHoneyPotFn = network === 'bsc' ? getTaxesForBscToken : item.network?.toLowerCase() === 'eth' ? getTokenTaxes : (add: string) => Promise.resolve({ honeypot: false, buy: null, sell: null });
          const isSafe = await isHoneyPotFn(item.addr, library?.provider)
          // const [price1, price2] = item.network?.toLowerCase() === 'bsc' ? [bnbPrice?.current, bnbPrice?.current] : [ethPrice, ethPriceOld]//

          // const tokenData = await tokenDataFn(item.addr, price1, price2);
          // const liquidity = tokenData?.totalLiquidityUSD && !isNaN(tokenData?.totalLiquidityUSD) ? Number(+tokenData?.totalLiquidityUSD * 2).toLocaleString() : '?';
          // 
          return {
            ...item,
            safe: !isSafe.honeypot,
            buyTax: isSafe?.buy,
            sellTax: isSafe?.sell,
           // liquidity
          }
        })) as Array<NewToken>;
        setData(data =>
          data?.map((item => safe?.some(a => a.addr === item.addr) ? safe.find(i => i.addr === item.addr) : item))
        )
      }
    } catch (err) {
      console.error(err)
    }
  }, [network, data, ethPrice, ethPriceOld, bnbPrice, chainId, library, flagSafe])
  const [loading, setLoading] = React.useState(false)

  const getData = React.useCallback(() => {
    const finallyClause = () => {
      setLastFetched(new Date())
    }
     return  axios.default.get(`https://tokenfomo.io/api/tokens/${network}?limit=500`, { method: "GET", headers: authHeader.headers })
      .then(async (response) => {
        const json =   response.data;
        const data = json.filter((a: NewToken) => moment(new Date()).diff(moment(new Date(+a.timestamp * 1000)), 'hours') <= 23);
        const sorted = orderBy(data, i => new Date(+i.timestamp * 1000), 'desc')
        const startIndex = page * AMT_PER_PAGE - AMT_PER_PAGE;
        const endIndex = startIndex + AMT_PER_PAGE;
        const pagedSet = sorted.slice(startIndex, endIndex);
        setData(current => [
          ... (current as NewToken[] && current?.length ? current : []),
          ...data.filter((item: any) => !current?.some(i => item?.addr === i?.addr))
        ])
        if (chainId &&
          network === networkMap[chainId]) await flagAllCallback(orderBy(pagedSet, i => new Date(+i.timestamp * 1000), 'desc'))
      }).finally(finallyClause)
      .catch(finallyClause)
  }, [network, page, library])

  useInterval(async () => {
    await getData()
  }, 45000, false)

  const fetchedText = React.useMemo(() => lastFetched ? moment(lastFetched).fromNow() : undefined, [moment(lastFetched).fromNow()])
  React.useEffect(() => {
      setLoading(true)
      setPage(1)
      setData(undefined)
      getData().finally(() => setLoading(false));
  }, [network, account, chainId])

  const [showInfo, setShowInfo] = React.useState(false)
  const kibaBalance = useKiba(account)
  const networkMap: Record<number, string> = {
    1: 'eth',
    56: 'bsc'
  }

  type SortStateKey =  'asc' | 'desc' | undefined;
  type SortState = {
    network:SortStateKey,
    symbol: SortStateKey
    name: SortStateKey,
    addr: SortStateKey,
    timestamp: SortStateKey,
    safe?: SortStateKey,
    buyTax?: SortStateKey,
    sellTax?: SortStateKey
    liquidity?: SortStateKey
  }
  const [sortState, setSortState] = React.useState<SortState>({
    'network':undefined,
    'symbol': undefined,
    'name': undefined,
    'addr': undefined,
    'timestamp': 'desc',
    'safe': undefined,
    'buyTax': undefined,
    'sellTax': undefined,
    'liquidity': undefined
  })

  const getActiveSort = () => {
    return accessDenied ? undefined : Object.keys(sortState).map(key => {
      const isKey = (sortState as any)[key] !== undefined
      return isKey ? {
        key: key,
        direction: (sortState as any)[key] as 'asc' | 'desc'
      } : undefined
    }).find(a => a?.key && a?.direction);
  }

  const onSortClick = ( key: keyof NewToken ) => {
    if (accessDenied) {
      Swal.fire({
        icon:"warning",
        toast: true,
        timerProgressBar: true,
        timer: 5000,
        position: 'bottom-end',
        text: "You cannot sort or filter the table unless you own Kiba Tokens",
        showConfirmButton: false,
        showCancelButton:false
      });
      return;
    };
    const activeKey = getActiveSort();
    if (activeKey && activeKey?.key !== key) {
    setSortState({
      ...sortState,
      [key]: sortState[key] !== undefined && sortState[key] === 'asc' ? 'desc' : 'asc',
      [activeKey.key]: undefined
    })
  } else {
    setSortState({
      ...sortState,
      [key]: sortState[key] !== undefined && sortState[key] === 'asc' ? 'desc' : 'asc',
    })
  }
  }

  React.useEffect(() => {
    const active = getActiveSort()
    if (active?.key && active?.direction) {
      orderByCallback(active?.key as keyof NewToken, active?.direction)
    }
  }, [sortState])

  const orderByCallback = React.useCallback((key:string | keyof NewToken, direction: 'asc' | 'desc') => {
    setData(orderBy(data, item => item[key as keyof NewToken], direction))
  }, [data, sortState])
  const [showHpInfo, setShowHpInfo] = React.useState(false)
  const accessDenied = React.useMemo(() => !account || !kibaBalance || +kibaBalance?.toFixed(0) <= 0, [kibaBalance, account])
  const helpTipText = `The honeypot checker will automatically run for the tokens listed to the current connected network. Currently connected to ${chainId && chainId === 1 ? 'Ethereum Mainnet' : chainId && chainId === 56 ? 'Binance Smart Chain' : ''}`;
  const infoTipText = `KibaFomo is auto-refreshing every 30 seconds to go and fetch the latest listed tokens. \r\n\r\nEvery token listed below has been ran through our smart-contract honey pot checks, to determine if it allows for buying and selling. \r\n\r\nThis is an experimental feature. Use at your own risk.`
  return <DarkCard style={{ maxWidth: 1000, background: 'radial-gradient(orange,rgba(129,3,3,.95))' }}>
    <Wrapper style={{ overflow: 'auto', padding: '9px 14px' }}>

      <div style={{ marginBottom: 10 }}>
        <h1>KibaFomo &nbsp;
          <Tooltip text={infoTipText} show={showInfo}>
            <Info onMouseEnter={() => setShowInfo(true)} onMouseLeave={() => setShowInfo(false)} />
          </Tooltip>
        </h1>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', marginBottom: 15, justifyContent: 'start', alignItems: 'center' }}>
          <Badge style={{ marginRight: 5, cursor: 'pointer' }} onClick={() => setNetwork('eth')} variant={network === 'eth' ? BadgeVariant.POSITIVE : BadgeVariant.DEFAULT}>ETH</Badge>
          <Badge style={{ marginRight: 5, cursor: 'pointer' }} onClick={() => setNetwork('bsc')} variant={network === 'bsc' ? BadgeVariant.POSITIVE : BadgeVariant.DEFAULT}>BSC</Badge>
          <Badge style={{ marginRight: 5, cursor: 'pointer' }} onClick={() => setNetwork('avax')} variant={network === 'avax' ? BadgeVariant.POSITIVE : BadgeVariant.DEFAULT}>AVAX</Badge>
          <Badge style={{ marginRight: 5, cursor: 'pointer' }} onClick={() => setNetwork('ftm')} variant={network === 'ftm' ? BadgeVariant.POSITIVE : BadgeVariant.DEFAULT}>FTM</Badge>
          <Badge style={{ marginRight: 5, cursor: 'pointer' }} onClick={() => setNetwork('poly')} variant={network === 'poly' ? BadgeVariant.POSITIVE : BadgeVariant.DEFAULT}>POLY</Badge>
          <Badge style={{ marginRight: 5, cursor: 'pointer' }} onClick={() => setNetwork('kcc')} variant={network === 'kcc' ? BadgeVariant.POSITIVE : BadgeVariant.DEFAULT}>KCC</Badge>
        </div>
        {accessDenied === false && chainId && network === networkMap[chainId] && <div>
          <label>Only Show Safe Listings</label>
          <input type="checkbox" checked={flagSafe} onChange={e => {
            setFlagSafe(e.target.checked)
          }} />
        </div>}
      </div>
      <div style={{ width: '100%', marginBottom: 5, marginTop: 10 }}>
        <small>KibaFomo only displays tokens that were listed within the last 24 hours.</small>
        {accessDenied === false && <> <br/><small>Buy tax, sell tax, and honey pot options will show for the current connected network.</small> </>}
        <input style={{
          width: '100%',
          padding: 13,
          margin: '5px 0px',
          border: '1px solid #eee',
          borderRadius: 12,
        }}
          placeholder={"Search for a specific newly listed token by symbol, name, or contract"}

          onChange={e => setSearchValue(e.target.value)}
          type={'search'}
        />
      </div>

      {fetchedText && <small>Last updated {fetchedText}</small>}
      {accessDenied === false && !!loading && <LoadingRows>
        <div />
        <div />
        <div />
        <div />
        <div />
        <div />
        <div />
      </LoadingRows>}
      {!loading && accessDenied === false && <Table style={{  fontSize: 12,background: '#222', color: "#FFF", width: "100%" }}>
        <tr style={{ textAlign: 'left' }}>
          <th onClick={() => onSortClick('name')} style={{ display:'table-cell', justifyContent:'space-between', cursor: 'pointer', textAlign: 'left' }}>
            Name
            {getActiveSort()?.key === 'name' && <>
              {getActiveSort()?.direction === 'asc' && <ChevronUp />}
              {getActiveSort()?.direction === 'desc' && <ChevronDown />}
            </>}
          </th>
          <th onClick={() => onSortClick('symbol')} style={{ display:'table-cell', justifyContent:'space-between', cursor: 'pointer',textAlign: 'left' }}>
            Symbol
            {getActiveSort()?.key === 'symbol' && <>
              {getActiveSort()?.direction === 'asc' && <ChevronUp />}
              {getActiveSort()?.direction === 'desc' && <ChevronDown />}
            </>}
          </th>
          <th onClick={() => onSortClick('addr')} style={{ display:'table-cell', justifyContent:'space-between', cursor: 'pointer',textAlign: 'left' }}>
            Contract Address
            {getActiveSort()?.key === 'addr' && <>
              {getActiveSort()?.direction === 'asc' && <ChevronUp />}
              {getActiveSort()?.direction === 'desc' && <ChevronDown />}
            </>}
            </th>
          {['bsc', 'eth'].includes(network) && <th style={{ display:'table-cell', justifyContent:'space-between', textAlign: 'left' }}>
            Buy
            </th>}
          {['bsc', 'eth'].includes(network) && <th style={{  display:'table-cell', justifyContent:'space-between',textAlign: 'left' }}>
            Link
            </th>}
          {chainId && network === networkMap[chainId] && <th style={{ display:'table-cell', justifyContent:'space-between', textAlign: 'left'}}>
            HP Check&nbsp;
            <Tooltip text={helpTipText} show={showHpInfo}>
              <Info onMouseEnter={() => setShowHpInfo(true)} onMouseLeave={() => setShowHpInfo(false)} />
            </Tooltip>
          </th>}
          {chainId && network === networkMap[chainId] && (
            <>
             {network === 'eth' && <th style={{  display:'table-cell', justifyContent:'space-between',textAlign: 'left' }}>Liquidity
              {getActiveSort()?.key === 'liquidity' && <>
              {getActiveSort()?.direction === 'asc' && <ChevronUp />}
              {getActiveSort()?.direction === 'desc' && <ChevronDown />}
            </>}</th>}
              <th onClick={() => onSortClick('buyTax')} style={{  display:'table-cell', justifyContent:'space-between',cursor: 'pointer',textAlign: 'left' }}>Buy
              {getActiveSort()?.key === 'buyTax' && <>
              {getActiveSort()?.direction === 'asc' && <ChevronUp />}
              {getActiveSort()?.direction === 'desc' && <ChevronDown />}
            </>}</th>
              <th onClick={() => onSortClick('sellTax')} style={{ display:'table-cell', justifyContent:'space-between',cursor: 'pointer', textAlign: 'left' }}>
                Sell
                {getActiveSort()?.key === 'sellTax' && <>
              {getActiveSort()?.direction === 'asc' && <ChevronUp />}
              {getActiveSort()?.direction === 'desc' && <ChevronDown />}
            </>}
                </th>
              </>
         )}
          <th onClick={() => onSortClick('timestamp')} style={{ display:'table-cell', justifyContent:'space-between',cursor: 'pointer', textAlign: 'left' }}>Time
          
          {getActiveSort()?.key === 'timestamp' && <>
              {getActiveSort()?.direction === 'asc' && <ChevronUp />}
              {getActiveSort()?.direction === 'desc' && <ChevronDown />}
            </>}</th>
        </tr>
        <tbody>

          {!loading && !!pagedData?.length && pagedData.map((item) => (
            <tr key={item.addr}>
              <td style={{ fontSize: 12 }}>{item.name}</td>
              <td>{item.symbol}</td>
              <td><small>{item.addr}</small> </td>
              {['eth'].includes(network) && item?.liquidity && <td>
                <Badge variant={BadgeVariant.PRIMARY}>{`${item.liquidity !== '?' ? `$${item.liquidity}`:  '?'}`}</Badge></td>}
              {['bsc', 'eth'].includes(network) && <td>{network === 'eth' && <StyledInternalLink to={`/swap?outputCurrency=${item.addr}`}><DollarSign style={{ color: 'white' }} /></StyledInternalLink>}
                {network === 'bsc' && <ExternalLink href={`https://cashewnutz.github.io/pancake_fork/#/swap?outputCurrency=${item.addr}`}><DollarSign style={{ color: 'white' }} /></ExternalLink>}
              </td>}
              {['bsc', 'eth'].includes(network) && <td><ExternalLinkIcon style={{ display: 'inline' }} href={`${network === 'eth' ? `https://etherscan.io/address/${item.addr}` : `https://bscscan.com/address/${item.addr}`}`} /></td>}
              {chainId && network === networkMap[chainId] && (<td>
                {['bsc', 'eth'].includes(network) && <>
                  {item?.safe === undefined && <Loader />}
                  {item?.safe === true && <CheckCircle fontSize={'18px'} fill={'green'} fillOpacity={0.7} />}
                  {item?.safe === false && <AlertCircle fontSize={'18px'} fill={'red'} fillOpacity={0.7} />}
                </>}
                {!['bsc', 'eth'].includes(item.network?.toLowerCase()) && <p>Switch networks to use this feature</p>}
              </td>)}
              {chainId && network === networkMap[chainId] && network === 'eth' &&  <td>
                <Liquidity addr={item.addr} ethPrice={ethPrice} ethPriceOld ={ethPriceOld} bnbPrice={bnbPrice} network={item.network} />
                </td>}
              {chainId && network === networkMap[chainId] && ['bsc', 'eth'].includes(network) && (<td>
                {(item?.buyTax || item?.buyTax === 0) && <Badge style={{fontSize:14}} variant={BadgeVariant.POSITIVE}>

                  {<small>{item.buyTax}% buy</small>}
                </Badge>}
              </td>)}
              {chainId && network === networkMap[chainId] && ['bsc', 'eth'].includes(network) && (<td>
                {(item?.sellTax || item?.sellTax === 0) && <Badge style={{fontSize:14, color:'#fff'}} color={'white'} variant={BadgeVariant.NEGATIVE}>

                  {<small>{item.sellTax}% sell</small>}
                </Badge>}
              </td>)}
              <td>{moment(new Date(+item.timestamp * 1000)).fromNow()}</td>
            </tr>
          ))}
        </tbody>
      </Table>}

      {accessDenied === false && <ul style={{ display: 'flex', flexFlow: 'row wrap', justifyContent: 'center', alignItems: 'center', listStyle: 'none' }}>
        {getPaginationGroup().map((number) => (
          <li style={{ fontWeight: number === page ? 600 : 500, cursor: 'pointer', marginRight: 10, fontSize: 24 }} key={number} onClick={() => {
            {
              setPage(number)
            }
          }
          }>{number}</li>
        ))}
      </ul>}

      {accessDenied && <p style={{ height: 400, width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        You must hold Kiba Inu tokens to use this feature.
      </p>}
    </Wrapper>
  </DarkCard >
}

const Liquidity = ({addr, network, ethPrice, ethPriceOld, bnbPrice}:{addr: string, network: string, ethPrice: any, ethPriceOld: any, bnbPrice:any}) => {
  const [liquidity, setLiquidity] = React.useState<any>()
  React.useEffect(() => {
    const func = async () => {
      const tokenDataFn = network?.toLowerCase() === 'bsc' ? fetchBscTokenData : network?.toLowerCase() === 'eth' ?  getTokenData : (add: string, p1: any, p2:any) => ({totalLiquidity: undefined});
      const [price1, price2] = network?.toLowerCase() === 'bsc' ? [bnbPrice?.current, bnbPrice?.current] : [ethPrice, ethPriceOld]
      const tokenData = await tokenDataFn(addr, price1,price2);
      const liquidity = tokenData?.totalLiquidityUSD && !isNaN(tokenData?.totalLiquidityUSD) ? Number(+tokenData?.totalLiquidityUSD * 2).toLocaleString() : '?';
      setLiquidity(liquidity)
    }
    func();
  }, [])

  return  <Badge variant={BadgeVariant.DEFAULT}>{liquidity ? liquidity : '?'}</Badge> 

}
