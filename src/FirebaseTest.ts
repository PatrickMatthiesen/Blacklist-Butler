import { getStorage } from "firebase-admin/storage";
import { initializeApp } from "firebase-admin/app";



// Initialize Firebase
const app = initializeApp();

const storage = getStorage(app);

const responce =  await storage.bucket().upload('guilds/793169144757223474/Blacklist.json', {
    destination: '793169144757223474/Blacklist.json',
    gzip: true,
});

console.log(responce[0].publicUrl());

console.log(responce);