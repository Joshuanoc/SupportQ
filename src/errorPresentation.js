const publicAppError=Object.freeze({
  title:'SupportQ could not load.',
  message:'Reload the application. If the problem continues, contact support and include the time the error occurred.'
});

export function getPublicAppError(){
  return publicAppError;
}
