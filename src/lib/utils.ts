export { cn } from "cn"

export const createId = (length: number = 15) => {
    let str = "";
    let chars = "QWERTYUIOPASDFGHJKLZXCVBNM1234567890-qwertyuiopasdfghjklzxcvbnm1234567890-";
    for(let i = 0; i < length; i++) {
        str += chars[Math.floor(Math.random() * chars.length)]
    }
    return str;
}