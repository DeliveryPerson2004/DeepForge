import 'dotenv/config'
import { Sandbox } from 'e2b'

const sandbox = await Sandbox.create()
const result = await sandbox.commands.run("pwd")

console.log(result.stdout)