import { MongoClient } from "mongodb";
import Config from "@/config/settings";

const uri = Config.MONGODB_URL;
const options = {};

let client;
let clientPromise: Promise<MongoClient>;

client = new MongoClient(uri, options);
clientPromise = client.connect();

export default clientPromise;
