import { Router } from "express";
import { registerController, securityPasswordController, sendMessageController, statusServiceController, deleteAccountController, urlPasswordController} from "../controllers/controllers";



const router = Router();


router.get('/status', statusServiceController); 
router.post('/send-message', sendMessageController);
router.get('/security-password',securityPasswordController);
router.post('/url-password',urlPasswordController);
router.get('/register', registerController);
router.post('/delete-account', deleteAccountController);
router.post('/register', registerController);



export default router;