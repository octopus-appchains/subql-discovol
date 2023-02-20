import { SubstrateEvent } from '@subql/types'
import {
  AppchainToNearTransfer,
  BridgeMessageEvent,
  EraEvent,
  LastBridgeMessageEventSequence,
} from '../types'
import { config } from '../config'
import { handleExtrinsic } from './handleExtrinsic'

export async function handleAppchainToNearAccount(
  _event: SubstrateEvent
): Promise<void> {
  const { event: evt, block, extrinsic } = _event
  const { data, method, section } = evt
  let msgSq = await LastBridgeMessageEventSequence.get('last')
  if (msgSq) {
    msgSq.sequence += 1
  } else {
    msgSq = new LastBridgeMessageEventSequence('last')
    msgSq.sequence = config.bridgeMessageStartAt.sequence
  }
  const { sequence } = msgSq
  const newMsg = new BridgeMessageEvent(sequence.toString())
  newMsg.sequence = sequence
  newMsg.eventType = evt.method
  newMsg.blockId = block.block.header.hash.toString()
  newMsg.timestamp = block.timestamp
  await Promise.all([
    msgSq.save(),
    newMsg.save(),
    handleExtrinsic(extrinsic, block),
  ])

  if (
    section === 'octopusLpos' &&
    ['PlanNewEra', 'EraPayout'].includes(method)
  ) {
    const [eraIndex] = data
    const newEra = new EraEvent(sequence.toString())
    newEra.sequence = sequence
    newEra.bridgeMessageEventId = sequence.toString()
    newEra.eventType = method
    newEra.eraIndex = Number(eraIndex.toString().replaceAll(',', ''))
    newEra.timestamp = block.timestamp
    newEra.blockId = block.block.header.hash.toString()
    await newEra.save()
  } else {
    const { fee = '0' }: any = data.toHuman()
    const record = new AppchainToNearTransfer(sequence.toString())
    record.sequence = sequence
    record.bridgeMessageEventId = sequence.toString()
    if (['Locked'].includes(method)) {
      const [sender, receiver, amount] = data
      record.senderId = sender.toString()
      record.receiver = Buffer.from(
        receiver.toHex().replace('0x', ''),
        'hex'
      ).toString('utf8')
      record.type = 'Locked'
      record.amount = BigInt(amount.toString().replaceAll(',', ''))
      record.fee = BigInt(fee.replaceAll(',', ''))
    } else if (['AssetBurned', 'Nep141Burned'].includes(method)) {
      const [assetId, sender, receiver, amount] = data
      record.senderId = sender.toString()
      record.receiver = Buffer.from(
        receiver.toHex().replace('0x', ''),
        'hex'
      ).toString('utf8')
      record.type = 'Nep141Burned'
      record.assetId = Number(assetId.toString().replaceAll(',', ''))
      record.amount = BigInt(amount.toString().replaceAll(',', ''))
      record.fee = BigInt(fee.replaceAll(',', ''))
    } else if (['NftLocked', 'NonfungibleLocked'].includes(method)) {
      const [collection, item, sender, receiver] = data
      record.senderId = sender.toString()
      record.receiver = Buffer.from(
        receiver.toHex().replace('0x', ''),
        'hex'
      ).toString('utf8')
      record.type = 'NonfungibleLocked'
      record.collection = BigInt(collection.toString().replaceAll(',', ''))
      record.item = BigInt(item.toString().replaceAll(',', ''))
      record.fee = BigInt(fee.replaceAll(',', ''))
    }
    record.timestamp = block.timestamp
    record.extrinsicId = `${block.block.header.number}-${extrinsic.idx}`
    await record.save()
  }
}
