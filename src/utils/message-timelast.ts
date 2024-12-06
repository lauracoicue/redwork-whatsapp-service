import { lastMessageTimeout } from "../config/config";


const messageTimeLast = (time: Date, timeMinuteMax?: number): boolean => {
    const now = new Date();
    const diff = Math.abs(now.getTime() - time.getTime());
    const minutes = Math.floor(diff / 60000);
    return minutes < (timeMinuteMax ?? lastMessageTimeout);
}


export default messageTimeLast;