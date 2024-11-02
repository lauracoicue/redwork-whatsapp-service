import { lastMessageTimeout } from "../config/config";


const messageTimeLast = (time: Date): boolean => {
    const now = new Date();
    const diff = Math.abs(now.getTime() - time.getTime());
    const minutes = Math.floor(diff / 60000);
    
    return minutes < lastMessageTimeout;
}


export default messageTimeLast;