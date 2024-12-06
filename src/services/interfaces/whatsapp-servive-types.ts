interface MessageRequest {
    phone: string;
    country: string;
    message: string | LocationMessage  | MediaMessage;
    userType: 'worker' | 'user'; 
    typeRequest: 'confirm' | 'notificate';
}


interface LocationMessage {
    latitude: number;
    longitude: number;
}

interface MediaMessage {
    base64?: string;
    url?: string;
    mimetype?: string;
    caption?: string;
}

export {MessageRequest, LocationMessage, MediaMessage};