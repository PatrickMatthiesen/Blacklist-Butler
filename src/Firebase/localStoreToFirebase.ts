import { getStorage } from "firebase-admin/storage";
import { initializeApp } from "firebase-admin/app";
import { readdir } from "node:fs/promises";


// Initialize Firebase
const app = initializeApp();

const storage = getStorage(app);

const dir = await readdir('./guilds/');

for (const subDir of dir) {
    console.log(subDir);
    const files = await readdir(`./guilds/${subDir}`);
    for (const file of files) {
        console.log(file);
        const responce = await storage.bucket().upload(`guilds/${subDir}/${file}`, {
            destination: `guilds/${subDir}/${file}`,
            gzip: true,
        });
        console.log(responce[0].publicUrl());
        console.log(responce);
        console.log();
    }
}

// const file = storage.bucket().file(`guilds/899233872447946804/Blacklist.json`);

// file.download().then((data) => {
//     console.log(data[0].toString());
//     // console.log(JSON.parse(data.toString()));
// });