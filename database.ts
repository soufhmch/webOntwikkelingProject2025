import { MongoClient, Db, Collection } from "mongodb";
import { Watch, Manufacturer,User } from "./interface";
import bcrypt from 'bcrypt';
import { UpdateResult } from "mongodb";

const uri = process.env.MONGODB_URI || "mongodb+srv://sofianehammich:Sofiane.153@watchesjson.1f3huul.mongodb.net/?retryWrites=true&w=majority&appName=WatchesJson";
const dbName = "watchesDB";

let db: Db;

// Database verbinding
export async function connectDB(): Promise<Db> {
    try {
        const client = await MongoClient.connect(uri);
        db = client.db(dbName);
        console.log('Verbonden met MongoDB');
        return db;
    } catch (error) {
        console.error('MongoDB verbindingsfout:', error);
        process.exit(1);
    }
}

// Data initialisatie
export async function initializeDatabase(): Promise<void> {
    try {
        const collection = getWatchCollection();
        if (await collection.countDocuments() === 0) {
            const response = await fetch('https://raw.githubusercontent.com/soufhmch/webOntwJson/main/watches.json');
            await collection.insertMany(await response.json());
            console.log(`Horloges succesvol ingeladen`);
        }
        const userCol = db.collection<User>('users');
  const count = await userCol.countDocuments();
  if (count === 0) {
    const salt = await bcrypt.genSalt(10);
    await userCol.insertMany([
      {
        name: 'Admin',
        email: 'admin@example.com',
        password: await bcrypt.hash('AdminPassword123', salt),
        role: 'ADMIN',
        createdAt: new Date()
      },
      {
        name: 'User',
        email: 'user@example.com',
        password: await bcrypt.hash('UserPassword123', salt),
        role: 'USER',
        createdAt: new Date()
      }
    ]);
    console.log('Default users aangemaakt');
  }
    } catch (error) {
        console.error('Data initialisatie mislukt:', error);
    }
}

// Hulpfuncties
function getWatchCollection(): Collection<Watch> {
    return db.collection<Watch>('watches');
}

// Data access
export async function fetchRandomWatches(limit = 3): Promise<Watch[]> {
    return getWatchCollection()
        .aggregate<Watch>([ // Explicit generic type
            { $sample: { size: limit } }
        ])
        .toArray();
}

export async function getAllWatches(): Promise<Watch[]> {
    return getWatchCollection().find().toArray();
}

export async function getWatchById(id: number): Promise<Watch | null> {
    return getWatchCollection().findOne({ id });
}

export async function getManufacturers(): Promise<Manufacturer[]> {
    return getWatchCollection()
        .aggregate<Manufacturer>([
            { $group: { _id: "$manufacturer.id", manufacturer: { $first: "$manufacturer" } } },
            { $replaceRoot: { newRoot: "$manufacturer" } }
        ])
        .toArray();
}

export async function createUser(user: Omit<User, '_id' | 'createdAt'>): Promise<User> {
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(user.password, saltRounds);
    
    const result = await db.collection<User>('users').insertOne({
        ...user,
        password: hashedPassword,
        createdAt: new Date()
    });

    // Haal het nieuwe document op met de insertedId
    const newUser = await db.collection<User>('users').findOne({
        _id: result.insertedId
    });

    if (!newUser) throw new Error('Gebruiker niet gevonden na aanmaken');
    return newUser;
}

export async function findUserByEmail(email: string): Promise<User | null> {
    return db.collection<User>('users').findOne({ email });
}

export async function verifyUser(email: string, password: string): Promise<User | null> {
    const user = await findUserByEmail(email);
    if (!user || !(await bcrypt.compare(password, user.password))) return null;
    return user;
}

export async function updateWatch(
  id: number,
  data: Partial<Watch>
): Promise<UpdateResult> {
  return db.collection<Watch>('watches').updateOne(
    { id },
    { $set: data }
  );
}