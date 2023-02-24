import { SubstrateExtrinsic, SubstrateBlock } from '@subql/types'
import { Extrinsic } from '../types'

export async function handleExtrinsic(
  extrinsic: SubstrateExtrinsic,
  block: SubstrateBlock
) {
  if (!extrinsic) {
    return
  }
  const extrinsicId = `${block.block.header.number}-${extrinsic.idx}`
  const record = new Extrinsic(extrinsicId)
  record.hash = extrinsic.extrinsic.hash.toString()
  record.method = extrinsic.extrinsic.method.method
  record.section = extrinsic.extrinsic.method.section
  record.args = extrinsic.extrinsic.args?.toString()
  record.signerId = extrinsic.extrinsic.signer?.toString()
  record.nonce = BigInt(extrinsic.extrinsic.nonce.toString()) || BigInt(0)
  record.timestamp = block.timestamp
  record.signature = extrinsic.extrinsic.signature.toString()
  record.tip = BigInt(extrinsic.extrinsic.tip.toString()) || BigInt(0)
  record.isSigned = extrinsic.extrinsic.isSigned
  record.isSuccess = extrinsic.success
  record.blockId = block.block.header.hash.toString()

  await record.save()
}
