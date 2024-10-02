import { OpenedContract, TonClient, WalletContractV4 } from 'ton'
import { KeyPair, mnemonicToPrivateKey } from 'ton-crypto'

const csv = require('csvtojson')

interface User {
	ID: number
	Address: string
	Amount: number
}

export type OpenedWallet = {
	contract: OpenedContract<WalletContractV4>
	keyPair: KeyPair
}

export async function openWallet(mnemonic: string[], testnet: boolean) {
	const keyPair = await mnemonicToPrivateKey(mnemonic)

	const toncenterBaseEndpoint: string = testnet
		? 'https://testnet.toncenter.com'
		: 'https://toncenter.com'
	const apiKey: string | undefined = testnet
		? process.env.TONCENTER_TESTNET_API_KEY
		: process.env.TONCENTER_MAINNET_API_KEY

	const client = new TonClient({
		endpoint: `${toncenterBaseEndpoint}/api/v2/jsonRPC`,
		apiKey: apiKey,
	})

	const wallet = WalletContractV4.create({
		workchain: 0,
		publicKey: keyPair.publicKey,
	})

	const contract = client.open(wallet)

	return { contract, keyPair }
}

export async function readUsers(csvFilePath: string): Promise<User[]> {
	const users = await csv().fromFile(csvFilePath)

	return users
}
