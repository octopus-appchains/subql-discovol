import { SubstrateEvent } from '@subql/types'
import { NearToAppchainTransfer } from '../types'
import { handleExtrinsic } from './handleExtrinsic'

export async function handleNearToAppchainAccount(_event: SubstrateEvent) {
  const { event: evt, block, extrinsic } = _event
  const { data, method } = evt

  const { sequence }: any = data.toHuman()
  const sequenceStr = sequence.toString().replaceAll(',', '')
  let record = new NearToAppchainTransfer(sequenceStr)
  record.sequence = Number(sequenceStr)

  if (['Unlocked', 'UnlockFailed'].includes(method)) {
    const [sender, receiver, amount] = data
    record.sender = Buffer.from(
      sender.toHex().replace('0x', ''),
      'hex'
    ).toString('utf8')
    record.receiverId = receiver.toString()
    record.type = method
    record.amount = BigInt(amount.toString().replaceAll(',', ''))
  } else if (
    [
      'AssetMinted',
      'Nep141Minted',
      'AssetMintFailed',
      'MintNep141Failed',
    ].includes(method)
  ) {
    const [assetId, sender, receiver, amount] = data
    record.sender = Buffer.from(
      sender.toHex().replace('0x', ''),
      'hex'
    ).toString('utf8')
    record.receiverId = receiver.toString()
    record.type = method
    record.assetId = Number(assetId.toString().replaceAll(',', ''))
    record.amount = BigInt(amount.toString().replaceAll(',', ''))
  } else if (
    [
      'NftUnlocked',
      'NonfungibleUnlocked',
      'NftUnlockFailed',
      'UnlockNonfungibleFailed',
    ].includes(method)
  ) {
    const [collection, item, sender, receiver, sequence] = data
    record.sender = Buffer.from(
      sender.toHex().replace('0x', ''),
      'hex'
    ).toString('utf8')
    record.receiverId = receiver.toString()
    record.type = method
    record.collection = BigInt(collection.toString().replaceAll(',', ''))
    record.item = BigInt(item.toString().replaceAll(',', ''))
  }
  record.timestamp = block.timestamp
  record.extrinsicId = `${block.block.header.number}-${extrinsic.idx}`
  await Promise.all([record.save(), handleExtrinsic(extrinsic, block)])
}
