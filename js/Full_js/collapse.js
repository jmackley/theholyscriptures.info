
/***********************************************
* Contractible Headers script- © Dynamic Drive (www.dynamicdrive.com)
* This notice must stay intact for legal use. Last updated Mar 23rd, 2004.
* Visit http://www.dynamicdrive.com/ for full source code
***********************************************/

var enablepersist='off' //Enable saving state of content structure using session cookies? (on/off)
var collapseprevious='no' //Collapse previously open content when opening present? (yes/no)

if (document.getElementById){
  document.write('<style type=\"text/css\">')
  document.write('.switchcontent{display:none;}')
  document.write('</style>')
}

function getElementbyClass(classname){
  ccollect=new Array()
  var inc=0
  var alltags=document.all? document.all : document.getElementsByTagName('*')
  for (i=0; i<alltags.length; i++){
    if (alltags[i].className==classname)
      ccollect[inc++]=alltags[i]
  }
}

function contractcontent(omit){
  var inc=0
  while (ccollect[inc]){
    if (ccollect[inc].id!=omit) {
      ccollect[inc].style.display='none';
    }
    inc++;
  }
}

function expandcontent(cid){
  if (typeof ccollect!='undefined') {
    if (collapseprevious=='yes') {
      contractcontent(cid);
    }
    //document.getElementById(cid).style.display=(document.getElementById(cid).style.display!='block')? 'block' : 'none'
    if (document.getElementById(cid).style.display!='block') {
      document.getElementById("showindicator").innerHTML = "&nbsp;&ndash; Hide TOC";
      document.getElementById(cid).style.display = 'block';
    } else {
      document.getElementById("showindicator").innerHTML = "&nbsp;+ Show TOC";
      document.getElementById(cid).style.display = 'none';
    }
    document.getElementById("commenttext").style.display = 'none';
  }
}

function revivecontent(){
  contractcontent('omitnothing')
  selectedItem=getselectedItem()
  selectedComponents=selectedItem.split('|')
  for (i=0; i<selectedComponents.length-1; i++)
    document.getElementById(selectedComponents[i]).style.display='block'
}

function get_cookie(Name) { 
var search = Name + '='
var returnvalue = '';
if (document.cookie.length > 0) {
  offset = document.cookie.indexOf(search)
  if (offset != -1) { 
    offset += search.length
    end = document.cookie.indexOf(';', offset);
    if (end == -1) end = document.cookie.length;
      returnvalue=unescape(document.cookie.substring(offset, end))
  }
}
return returnvalue;
}

function getselectedItem(){
if (get_cookie(window.location.pathname) != ''){
  selectedItem=get_cookie(window.location.pathname)
  return selectedItem
}
  else
  return ''
}

function saveswitchstate(){
var inc=0, selectedItem=''
while (ccollect[inc]){
  if (ccollect[inc].style.display=='block')
    selectedItem+=ccollect[inc].id+'|'
    inc++
}

document.cookie=window.location.pathname+'='+selectedItem
}

function do_onload(){
  uniqueidn=window.location.pathname+'firsttimeload'
  getElementbyClass('switchcontent')
  if (enablepersist=='on' && typeof ccollect!='undefined'){
    document.cookie=(get_cookie(uniqueidn)=='')? uniqueidn+'=1' : uniqueidn+'=0' 
    firsttimeload=(get_cookie(uniqueidn)==1)? 1 : 0 //check if this is 1st page load
  if (!firsttimeload)
    revivecontent()
  }
}


if (window.addEventListener)
  window.addEventListener('load', do_onload, false)
else if (window.attachEvent)
  window.attachEvent('onload', do_onload)
else if (document.getElementById)
  window.onload=do_onload

if (enablepersist=='on' && document.getElementById)
  window.onunload=saveswitchstate

