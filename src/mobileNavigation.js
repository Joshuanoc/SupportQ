export function drawerButtons(drawer){
  try{
    return Array.from(drawer?.querySelectorAll?.('button')??[]);
  }catch{
    return [];
  }
}
