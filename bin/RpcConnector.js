import fetch from 'node-fetch'
import { JsonRpc } from 'eosjs'

import AppConfig from '../config.js'

class RpcConnector {
	constructor() {
    this.endpoints = []
    this.makeEndpoints()
		this.changeRpc()
	}

  makeEndpoints() {
    for(let i = 0; i < AppConfig.rpc_endpoints.length; ++i)
      this.endpoints.push({
        url: AppConfig.rpc_endpoints[i],
        last_use: 0,
        last_fail: 0,
        fail_cpt: 0,
      })
  }

  updateLastUse(url) {
    const index = this.endpoints.findIndex(e => e.url === url)

    if(index === -1)
      return;

    this.endpoints[index].last_use = Date.now()
  }

  updateLastFail(url) {
    const index = this.endpoints.findIndex(e => e.url === url)

    if(index === -1)
      return;

    this.endpoints[index].last_fail = Date.now()
    ++this.endpoints[index].fail_cpt
  }

  selectRpc() {
    // filter out endpoints with more than 5 fail_cpt or a last_fail less than 10 minutes ago
    const availableEndpoints = this.endpoints.filter(endpoint => {
      return endpoint.fail_cpt < 5 && (Date.now() - endpoint.last_fail) > 600000;
    });

    // sort the remaining endpoints by last_use
    availableEndpoints.sort((a, b) => a.last_use - b.last_use);

    // return the first endpoint in the sorted list
    return availableEndpoints[0];
  }

  changeRpc() {
    const selectedRpc = this.selectRpc()
    this.updateLastUse(selectedRpc.url)
    this.rpc = new JsonRpc(selectedRpc.url, { fetch }) 
  }
}

const rpcConnector = new RpcConnector()

export const rpc = rpcConnector.rpc

export const fetchTable = async(contract, scope, table, params = {}, prevRows = []) => {
  rpcConnector.changeRpc()
  const rpcUrl = rpcConnector.rpc.endpoint
  try {
    const res = await rpcConnector.rpc.get_table_rows({
      code: contract,
      scope: scope,
      table: table,
      limit: params.limit || 1000,
      lower_bound: params.lower_bound || null,
      upper_bound: params.upper_bound || null,
      reverse: false,
      show_payer: false,
      json: true,
    })

    let rows = prevRows.concat(res.rows)
    if(res.more) {
      params.lower_bound = res.next_key
      rows = await fetchTable(contract, scope, table, params, rows)
      return rows
    }
    else
      return rows
  }
  catch(e) {
    rpcConnector.updateLastFail(rpcUrl)
    console.log('RPC '+rpcUrl+' failed')
    return await fetchTable(contract, scope, table, params, prevRows)
  }
}