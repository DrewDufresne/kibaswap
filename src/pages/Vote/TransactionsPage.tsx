import { useWeb3React } from '@web3-react/core';
import { ButtonOutlined } from 'components/Button';
import { Wrapper } from 'components/swap/styleds';
import moment from 'moment';
import { LoadingRows } from 'pages/Pool/styleds';
import React from 'react';
import { AlertCircle, FilePlus } from 'react-feather';
import { useUserTransactions } from 'state/logs/utils';
import Web3 from 'web3'
export const Transactions = ({transactions, loading, error}:{transactions?: any[], loading?:boolean, error?:any}) => {
    const { account, chainId, library } = useWeb3React()
    const chainLabel = React.useMemo(() => chainId && chainId === 1 ? 'ETH' : chainId && chainId === 56 ? 'BNB' : '', [chainId])
    const formattedTransactions = React.useMemo( () => {
            return transactions?.map((swap: any) => {
                console.dir(swap)
            const netToken0 = swap.amount0In - swap.amount0Out
            const netToken1 = swap.amount1In - swap.amount1Out
            const newTxn: Record<string, any> = {}
            if (netToken0 < 0) {
                newTxn.token0Symbol = (swap.pair).token0.symbol
                newTxn.token1Symbol = (swap.pair).token1.symbol
                newTxn.token0Name = swap.pair.token0.name;
                newTxn.token1Name = swap.pair.token1.name;
                newTxn.token0Amount = Math.abs(netToken0)
                newTxn.token1Amount = Math.abs(netToken1)
            } else if (netToken1 < 0) {
                newTxn.token0Symbol = (swap.pair).token1.symbol
                newTxn.token0Name = swap.pair.token0.name;
                newTxn.token1Name = swap.pair.token1.name;
                newTxn.token1Symbol = (swap.pair).token0.symbol
                newTxn.token0Amount = Math.abs(netToken1)
                newTxn.token1Amount = Math.abs(netToken0)
            }
            newTxn.to = swap.to;
            newTxn.sender = swap.sender;
            newTxn.from = swap.from;
            newTxn.transaction = swap.transaction;
            newTxn.hash = swap.transaction.id
            newTxn.timestamp = swap?.timestamp ? swap?.timestamp : swap.transaction.timestamp
            newTxn.type = 'swap'
            newTxn.amountUSD = swap.amountUSD;
            newTxn.account = swap.to === "0x7a250d5630b4cf539739df2c5dacb4c659f2488d" ? swap.sender : swap.to
            newTxn.buy = swap.to
            newTxn.amount0In = swap.amount0In;
            newTxn.gasPaid = swap.cost;
            console.log(newTxn)
            return newTxn;
        })
    }, [transactions])

    const exportToCsv = React.useCallback(() => {
    if (!formattedTransactions?.length || !formattedTransactions) return;
    // The download function takes a CSV string, the filename and mimeType as parameters
    // Scroll/look down at the bottom of this snippet to see how download is called
    const downloadCsvFileToClient = function (content: any, fileName: any, mimeType: any) {
        const a = document.createElement('a');
        mimeType = mimeType || 'application/octet-stream';

        if (URL && 'download' in a) { //html5 A[download]
            a.href = URL.createObjectURL(new Blob([content], {
                type: mimeType
            }));
            a.setAttribute('download', fileName);
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        } else {
            window.open('data:application/octet-stream,' + encodeURIComponent(content), '_blank'); // only this mime type is supported
        }
    }
        const formattedData = (formattedTransactions ?? [])?.map((tx: any) => {
            const type = tx.token0Symbol === `W${chainLabel}` ? 'Sell' : 'Buy' 
            const date = new Date(+tx.timestamp * 1000).toLocaleString()
            console.log('transaction for csv' , tx)
            return [
                date, 
                type, 
                type === 'Sell' ? `${tx.token1Name} (${tx.token0Symbol})` : `${tx.token0Name} (${tx.token0Symbol})`, 
                Number(parseFloat(tx.token0Amount.toString()).toFixed(2)).toLocaleString(), 
                type === 'Sell' ? `${tx.token0Name} (${tx.token1Symbol})` : `${tx.token1Name} (${tx.token1Symbol})`,                 Number(parseFloat(tx.token1Amount.toString()).toFixed(2)).toLocaleString(), 
                Number(parseFloat(tx.gasPaid.toString()).toFixed(6)).toLocaleString(), 
                Number(parseFloat(tx.amountUSD.toString()).toFixed(2)).toLocaleString()
            ];
        })

        const headers = [
            [
                "Date", 
                "Type", 
                "Swapped To",
                "Swapped To Amount", 
                "Swapped From", 
                "Swapped From Amount", 
                "Gas Paid (ETH)", 
                "Amount USD"
            ]
        ];
        const allCsvData = [
            ...headers,
            ...formattedData
        ];
        let csvString = ''
        for (let i = 0; i < allCsvData.length; i++) {
            const value = allCsvData[i];
            for (let j = 0; j < value.length; j++) {
                const innerValue = value[j] === null ? '' : value[j].toString();
                let result = innerValue.replace(/"/g, '""');
                if (result.search(/("|,|\n)/g) >= 0)
                    result = '"' + result + '"';
                if (j > 0)
                    csvString += ',';
                csvString += result;
            }
            csvString += '\n';
        }
        downloadCsvFileToClient(
            csvString, 
            `${account}_export_${moment().unix()}.csv`, 
            'text/csv;encoding:utf-8'
        )
    }, [formattedTransactions])
    return (
        <Wrapper style={{ maxHeight: 450, overflow: 'auto' }}>
            <div style={{display:'flex',justifyContent:'end', marginBottom:5}}>
                <ButtonOutlined onClick={exportToCsv}>
                    Export to CSV    <FilePlus style={{cursor:'pointer', fontSize:20}}   />
                </ButtonOutlined>
            </div>
            {!account && <p style={{ height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Please connect your wallet.</p>}
            { !formattedTransactions?.length && <LoadingRows>
                <div />
                <div />
                <div />
                <div />
                <div />
                <div />
                <div />
                <div />
            </LoadingRows>}

            {error && <p style={{ height: 400, display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%' }}><AlertCircle /> &nbsp; An error occurred fetching your transactions</p>}

            <div style={{
                display: 'block',
                width: '100%',
                overflowY: 'auto',
                maxHeight: 500
            }}>
                <table style={{ width: '100%' }}>
                    <thead style={{
                        textAlign: 'left',
                        position: 'sticky',
                        top: 0,
                        background: '#222'
                    }}>
                        <tr>
                            <th>Date</th>
                            <th>Type</th>
                            <th>Amt <small>{chainLabel}</small></th>
                            <th>Amt <small>Tokens</small></th>
                            <th>Amt <small>USD</small></th>
                            <th>Hash</th>
                        </tr>
                    </thead>
                    <tbody>
                        {formattedTransactions && formattedTransactions?.map((item: any, index: number) => (
                            <tr key={`_${item.timestamp * 1000}_${item.hash}_${index}`}>
                                <td style={{ fontSize: 12 }}>{moment(item.timestamp * 1000).toDate().toLocaleString()}</td>
                                <td style={{color: item.token0Symbol === `W${chainLabel}` ? 'red' : item.isTransfer ? 'yellow' : 'green' }}>
                                    { item.token0Symbol === `W${chainLabel}` ? 'Sell' : 'Buy'} {item.isTransfer && 'Transfer'}
                                </td>
                                <td>{item.token0Symbol === `W${chainLabel}` && <>{Number(+item.token0Amount?.toFixed(2))?.toLocaleString()} {item.token0Symbol}</>}
                                    {item.token1Symbol === `W${chainLabel}` && <>{Number(+item.token1Amount?.toFixed(2))?.toLocaleString()} {item.token1Symbol}</>}
                                </td>
                                <td>{item.token0Symbol !== `W${chainLabel}` && <>{Number(+item.token0Amount?.toFixed(2))?.toLocaleString()} {item.token0Symbol}</>}
                                    {item.token1Symbol !== `W${chainLabel}` && <>{Number(+item.token1Amount?.toFixed(2))?.toLocaleString()} {item.token1Symbol}</>}
                                </td>
                                <td>${Number(item.amountUSD).toFixed(2).toLocaleString()}</td>
                            
                                <td>
                                    <a href={`https://${chainId === 1 ? 'etherscan.io' : 'bscscan.com'}/tx/${item?.hash}`}>
                                        {item?.hash && item?.transaction?.id.slice(0, 6) + '...' + item?.transaction?.id.slice(38, 42)}
                                    </a>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

        </Wrapper>
    )
}