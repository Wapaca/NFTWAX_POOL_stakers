import { fetchTable } from './bin/RpcConnector.js'

const NFTWAX_PRECISION = 4 
const NFTV_PRECISION = 8
const WAX_PRECISION = 8

let nftvPool = null;

function sortArrayByAmountDesc(array) {
  array.sort(function(a, b) {
    return Number(b.amount) - Number(a.amount);
  });
  return array;
}

function getAssetAmount(asset, precision) {
	asset = asset.split(' ')
	return Number(asset[0])*Math.pow(10, precision)
}
const fetchNFTVpool = async () => {
	nftvPool = await fetchTable('swap.taco', 'swap.taco', 'pairs', {lower_bound: 'NFTWAX', upper_bound: 'NFTWAX'})
	nftvPool = nftvPool[0]

	nftvPool = {
		lpsupply: getAssetAmount(nftvPool.supply, NFTWAX_PRECISION),
		NFTVsupply: getAssetAmount(nftvPool.pool1.quantity, NFTV_PRECISION),
		WAXsupply: getAssetAmount(nftvPool.pool2.quantity, WAX_PRECISION),
	}

	return true
}

function getStakedTokens(NFTWAXamount) {
	return {
		WAXamount: nftvPool.WAXsupply*NFTWAXamount/nftvPool.lpsupply,
		NFTVamount: nftvPool.NFTVsupply*NFTWAXamount/nftvPool.lpsupply
	}
}

function displayStakers(array) {
  const sortedArray = sortArrayByAmountDesc(array);
  let totalAmount = 0;

  console.log('List of all stakers sorted by amount (descending):');
  console.log('-----------------------------------------------');

  for(const item of sortedArray)
  	totalAmount += Number(item.amount);
  for(let i = 0; i < sortedArray.length; ++i) {
  	const item = sortedArray[i]
  	const stakedTokens = getStakedTokens(Number(item.amount))
  	console.log(`#${i+1} ${item.user}: ${1/Math.pow(10, NFTWAX_PRECISION)*item.amount} NFTWAX (${1/Math.pow(10, WAX_PRECISION)*stakedTokens.WAXamount} WAX + ${1/Math.pow(10, NFTV_PRECISION)*stakedTokens.NFTVamount} NFTV) ${((100*item.amount)/totalAmount).toFixed(6)}%`);
  }

  console.log('');
  console.log(`Total number of stakers: ${sortedArray.length}`);
  const totalStakedTokens = getStakedTokens(totalAmount)
  console.log(`Total amount staked: ${1/Math.pow(10, 4)*totalAmount} NFTWAX (${1/Math.pow(10, WAX_PRECISION)*totalStakedTokens.WAXamount} WAX + ${1/Math.pow(10, NFTV_PRECISION)*totalStakedTokens.NFTVamount} NFTV)`);
  console.log(`Liquidity staked: ${100*totalAmount/nftvPool.lpsupply}%`);
}


const main = async() => {
	await fetchNFTVpool()
	const stakers = await fetchTable('swap.taco', 'NFTWAX', 'pairowners')
	displayStakers(stakers)
}

main()