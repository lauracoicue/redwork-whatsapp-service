interface CurrentWorkersRegister {
    [key: string]: {
      step: number;
      awaitingInput: boolean;
      lastMessage: Date;
    };
  }
  
interface WorkerRegister {
    [key: string]: string 
}
  
interface NewWorker {
    [key: string]: WorkerRegister;
}


export { CurrentWorkersRegister, NewWorker };
  

