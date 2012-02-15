function(doc, req){
  if (doc.collection){
    return true;
  }
  return false;
}