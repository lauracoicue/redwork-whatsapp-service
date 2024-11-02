import { CronJob } from 'cron';

const cronService = (callback: () => void, time:string ): void => {
    try {
        new CronJob(
            time, 
            callback, 
            null,
            true, 
            'America/Bogota'
        );
    } catch (error) {
        console.error(`Error starting cron job: ${error}`);
        process.exit(1);
    }
}


export default cronService;