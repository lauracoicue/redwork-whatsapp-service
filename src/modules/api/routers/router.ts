import { Router } from "express";
import { sendMessageController, statusServiceController } from "../controllers/controllers";



const router = Router();


router.get('/status', statusServiceController); 
router.post('/send-message', sendMessageController);


export default router;