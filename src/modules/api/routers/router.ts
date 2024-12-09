import { Router } from "express";
import { registerController, securityPasswordController, sendMessageController, statusServiceController, deleteAccountController, urlPasswordController, updateAccountController} from "../controllers/controllers";



const router = Router();


router.get('/status', statusServiceController); 
router.post('/send-message', sendMessageController);
router.get('/security-password',securityPasswordController);
router.post('/reset-password',urlPasswordController);
router.post('/update-account', updateAccountController);
router.post('/register', registerController);
router.get('/register', registerController);
router.post('/delete-account', deleteAccountController);



export default router;