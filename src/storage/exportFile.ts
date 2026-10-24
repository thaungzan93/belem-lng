import {Platform} from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

/** Deliver an actual file: browser download or the Android/iOS system share sheet. */
export async function deliverFile(content:string,filename:string,mimeType:string):Promise<void>{
 const safeName=filename.replace(/[^A-Za-z0-9._-]/g,'_');
 if(!safeName||safeName==='.'||safeName==='..')throw new Error('Use a valid export filename');
 if(Platform.OS==='web'){
  if(typeof document==='undefined')throw new Error('File downloads are unavailable here');
  const url=URL.createObjectURL(new Blob([content],{type:mimeType}));
  const link=document.createElement('a');link.href=url;link.download=safeName;
  try{document.body.appendChild(link);link.click();}finally{link.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);}
  return;
 }
 if(!await Sharing.isAvailableAsync())throw new Error('File sharing is unavailable on this device');
 if(!FileSystem.cacheDirectory)throw new Error('Device export storage is unavailable');
 const directory=`${FileSystem.cacheDirectory}watch-exports/`;
 await FileSystem.makeDirectoryAsync(directory,{intermediates:true});
 const uri=directory+safeName;
 await FileSystem.writeAsStringAsync(uri,content,{encoding:FileSystem.EncodingType.UTF8});
 await Sharing.shareAsync(uri,{mimeType,dialogTitle:safeName,UTI:mimeType==='application/json'?'public.json':'public.comma-separated-values-text'});
}
