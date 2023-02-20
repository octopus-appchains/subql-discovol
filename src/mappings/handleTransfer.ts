import { SubstrateEvent } from '@subql/types'
import { AccountId, Balance } from '@polkadot/types/interfaces/runtime'
import { Account, SystemTokenTransfer } from '../types'
import { syncAccount, createAccount } from './accounts'
import { handleExtrinsic } from './handleExtrinsic'

async function checkAccount(accountId: string, timestamp: Date) {
  const existedAccount = await Account.get(accountId)

  if (existedAccount) {
    await syncAccount(existedAccount)
  } else {
    await createAccount({
      accountId: accountId,
      timestamp,
    })
  }
}

export async function handleTransfer(event: SubstrateEvent): Promise<void> {
  const {
    event: {
      data: [from_origin, to_origin, amount_origin],
    },
    block,
    extrinsic,
  } = event

  const from = (from_origin as AccountId).toString()
  const to = (to_origin as AccountId).toString()
  const amount = (amount_origin as Balance).toBigInt()

  const record = new SystemTokenTransfer(
    `${block.block.header.number.toString()}-${extrinsic.idx}`
  )
  record.fromId = from
  record.toId = to
  record.amount = amount
  record.timestamp = block.timestamp
  record.extrinsicId = extrinsic.extrinsic.hash.toString()
  await Promise.all([
    checkAccount(from, block.timestamp),
    checkAccount(to, block.timestamp),
    handleExtrinsic(extrinsic, block),
    record.save(),
  ])
}
