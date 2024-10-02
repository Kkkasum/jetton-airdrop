import * as dotenv from 'dotenv'
import { Address, beginCell, internal, toNano } from 'ton-core'
import { sleep, waitSeqno } from './delay'
import {
	getJettonWalletAddress,
	OpenedWallet,
	openWallet,
	readUsers,
} from './utils'

dotenv.config()

async function init() {
	let wallet: OpenedWallet
	let jettonWalletAddress: Address
	if (
		process.env.NETWORK === 'TESTNET' &&
		process.env.JETTON_MASTER_ADDRESS
	) {
		wallet = await openWallet(process.env.MNEMONIC!.split(' '), true)
		jettonWalletAddress = await getJettonWalletAddress(
			wallet.contract.address,
			Address.parse(process.env.JETTON_MASTER_ADDRESS),
			true
		)
	} else if (
		process.env.NETWORK === 'MAINNET' &&
		process.env.JETTON_MASTER_ADDRESS
	) {
		wallet = await openWallet(process.env.MNEMONIC!.split(' '), false)
		jettonWalletAddress = await getJettonWalletAddress(
			wallet.contract.address,
			Address.parse(process.env.JETTON_MASTER_ADDRESS),
			false
		)
	} else {
		return
	}

	console.log(`Your wallet address: ${wallet.contract.address}`)
	console.log(`Jetton wallet address ${jettonWalletAddress}`)

	const users = await readUsers('data/users.csv')

	const forwardPayload = beginCell()
		.storeUint(0, 32)
		.storeStringTail('AIRDROP')
		.endCell()

	for (let i = 0; i < users.length; i++) {
		const jettonAmount = toNano(users[i].Amount)
		const destinationAddress = Address.parse(users[i].Address)
		const body = beginCell()
			.storeUint(0x0f8a7ea5, 32)
			.storeUint(0, 64)
			.storeCoins(jettonAmount)
			.storeAddress(destinationAddress)
			.storeAddress(destinationAddress)
			.storeBit(0)
			.storeCoins(toNano('0.02'))
			.storeBit(1)
			.storeRef(forwardPayload)
			.endCell()

		const seqno = await wallet.contract.getSeqno()
		await wallet.contract.sendTransfer({
			seqno: seqno,
			secretKey: wallet.keyPair.secretKey,
			messages: [
				internal({
					to: jettonWalletAddress,
					value: toNano('0.1'),
					bounce: true,
					body: body,
				}),
			],
		})

		console.log(
			`Sent ${users[i].Amount} jettons to User #${users[i].ID} by Address <${users[i].Address}>`
		)

		await waitSeqno(seqno, wallet)
		await sleep(25000)
	}
}

void init()
