function(doc, req){
  if (doc.type){
    return true;
  }
  return false;
}