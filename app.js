var $ = require('jquery');
var swal = require('sweetalert2');
var herajs = require('@herajs/client');
var aergo;
var chainId = 'testnet.aergo.io';
var account_address;
var showbox = false;
var all_dapps = [];
var modal;

const ecosystem_address_mainnet = ""
const ecosystem_address_testnet = "AmhYzCrqoYJXGpQiCbvMPaT1bCTbPL5E8J3R5cgsYNkLPicDTacU"
const ecosystem_address_alphanet = ""
var ecosystem_address


function install_extension_click() {
  var win = window.open('https://chrome.google.com/webstore/detail/aergo-connect/iopigoikekfcpcapjlkcdlokheickhpc', '_blank');
  win.focus();
  hide_box();
}

function hide_box() {
  showbox = false;
  $('#no-extension').remove();
}

function connect_to_aergo() {
  var url

  if (chainId == "testnet.aergo.io") {
    ecosystem_address = ecosystem_address_testnet
  } else if (chainId == "aergo.io") {
    ecosystem_address = ecosystem_address_mainnet
  } else if (chainId == "alpha.aergo.io") {
    ecosystem_address = ecosystem_address_alphanet
  } else {
    document.getElementById("error").innerHTML = "This network is not yet supported";
    document.getElementById("error").style.display = "block";
    return false
  }

  if (chainId == "aergo.io") {
    url = "mainnet-api-http.aergo.io"
  } else if (chainId == "testnet.aergo.io") {
    url = "testnet-api-http.aergo.io"
  } else if (chainId == "alpha.aergo.io") {
    url = "alpha-api-http.aergo.io"
  }
  url = 'https://' + url
  aergo = new herajs.AergoClient({}, new herajs.GrpcWebProvider({url: url}))
}

function aergoConnectCall(action, responseType, data) {

  showbox = true;
  setTimeout(function() {
    if (!showbox) return;

    const box = '<div id="no-extension" class="no-extension swal2-container swal2-center">' +
    '<div class="swal2-content swal2-html-container" style="display: block;"><br>Nothing happened?</div>' +
    '<button id="install-extension" type="button" class="swal2-confirm swal2-styled" aria-label="" ' +
    'style="display: inline-block; background-color: rgb(229, 0, 125); border-left-color: rgb(229, 0, 125);' +
    'border-right-color: rgb(229, 0, 125);">Install Aergo Connect</button></div>';

    $('body').append(box);
    $("#install-extension").click(install_extension_click);

  }, 3000);

  return new Promise((resolve, reject) => {
    window.addEventListener(responseType, function(event) {
      hide_box();
      if ('error' in event.detail) {
        reject(event.detail.error);
      } else {
        resolve(event.detail);
      }
    }, { once: true });
    window.postMessage({
      type: 'AERGO_REQUEST',
      action: action,
      data: data,
    }, '*');
  });

}

async function getActiveAccount() {
  const result = await aergoConnectCall('ACTIVE_ACCOUNT', 'AERGO_ACTIVE_ACCOUNT', {});
  chainId = result.account.chainId;
  return result.account.address;
}

async function startTxSendRequest(txdata, msg, callback) {
  const result = await aergoConnectCall('SEND_TX', 'AERGO_SEND_TX_RESULT', txdata);
  console.log('AERGO_SEND_TX_RESULT', result);

  swal.fire({
    title: 'Transaction sent!',
    text: 'Waiting inclusion on blockchain...',
    allowEscapeKey: false,
    allowOutsideClick: false,
    onOpen: () => {
      swal.showLoading();
    }
  })

  if (!aergo) {
    connect_to_aergo()
  }

  // wait until the transaction is executed and included in a block, then get the receipt
  const receipt = await aergo.waitForTransactionReceipt(result.hash);
  console.log("receipt", receipt);

  if (receipt.status != "SUCCESS") {
    swal.fire({
      icon: 'error',
      title: 'Failed!',
      text: receipt.result
    })
    return false
  }

  swal.fire({
    icon: 'success',
    //title: 'Done',
    html: '<br>' + msg + '<br>&nbsp;',
    width: 600,
    padding: '3em',
    confirmButtonColor: '#e5007d',
    background: '#fff'
  })

  if (callback) {
    callback();
  }
}

function encode_utf8(s) {
  return unescape(encodeURIComponent(s));
}

//////////////////////////////////////////////////////////////////////////////////

function get_typed_app() {

  var name = document.getElementById("appName").value
  var description = document.getElementById("appDescription").value
  var web2URL = document.getElementById("web2URL").value
  var web3URL = document.getElementById("web3URL").value
  var image = document.getElementById("image").value
  var tags = document.getElementById("tags").value

  if (!name) {
    swal.fire({
      icon: 'error',
      text: 'You must inform the name of the app'
    })
    return null
  }
  if (!description) {
    swal.fire({
      icon: 'error',
      text: 'You must inform the description'
    })
    return null
  }
  if (!web2URL && !web3URL) {
    swal.fire({
      icon: 'error',
      text: 'You must inform the web2 or web3 URL to access the app'
    })
    return null
  }

  var app = {
    name: name,
    description: description,
    web2_url: web2URL,
    web3_url: web3URL,
    image_url: image,
    tags: tags
  }

  return app
}

async function add_new_app() {

  var app = get_typed_app()
  if (!app) return

  var txdata = {
    type: 5,  // CALL
    from: account_address,
    to: ecosystem_address,
    amount: 0,
    payload_json: {
      Name: "new",
      Args: [app]
    }
  }

  startTxSendRequest(txdata, 'The app was added to the Aergo ecosystem!',
    function() {
      close_modal()
      update_list() 
    });
}

window.update_app = async function(app_index) {

  var app = get_typed_app()
  if (!app) return

  var txdata = {
    type: 5,  // CALL
    from: account_address,
    to: ecosystem_address,
    amount: 0,
    payload_json: {
      Name: "update",
      Args: [app_index, app]
    }
  }

  startTxSendRequest(txdata, 'The app information was updated!',
    function() {
      close_modal()
      update_list()
    });
}

async function connect_wallet_click() {

  account_address = await getActiveAccount();
  if (!account_address) return

  if (!aergo) {
    connect_to_aergo()
  }

  document.getElementById("connect-wallet").style.display = "none";
  document.getElementById("displayInsert").style.display = "inline-flex";
}

async function update_list() {

  if (!aergo) {
    connect_to_aergo()
  }

  //$('#list .card').remove()
  // remove all cards from the list using vanilla JS
  var list = document.getElementById('list');
  while (list.firstChild) {
    list.removeChild(list.firstChild);
  }
  // display the loading spinner
  document.getElementById('loader').style.display = 'block';

  all_dapps = [];

  for (var first = 1; ; first += 200) {
    var cards = "";
  
    try {
      var dapps = await aergo.queryContract(ecosystem_address, "get_apps", first)
    } catch (e) {
      console.log(e)
      // show the error div
      document.getElementById("error").style.display = "block";
    }

    if (!dapps || !Array.isArray(dapps)) dapps = [];

    //for (var dapp of dapps) {
    for (var i = 0; i < dapps.length; i++) {
      var dapp = dapps[i];
      var app_index = first + i;

      //dapp.name
      //dapp.description
      //dapp.web2_url
      //dapp.web3_url
      //dapp.image_url
      //dapp.tags

      var has_web2 = (dapp.web2_url != "") ? "" : "hidden";
      var has_web3 = (dapp.web3_url != "") ? "" : "hidden";

      var card =
`<div class="col">
<div class="card" onclick="window.display_update(${app_index})">
  <img class="card-img-top" src="${dapp.image_url}" alt="${dapp.name}"/>
  <div class="card-body">
    <h5 class="card-title">${dapp.name}</h5>
    <p class="card-text">${dapp.description}</p>
    <a href="${dapp.web2_url}" class="btn btn-primary ${has_web2}" target="_blank">Web2</a>&nbsp;
    <a href="${dapp.web3_url}" class="btn btn-primary ${has_web3}" target="_blank">Web3</a>
  </div>
</div>
</div>`;

      cards += card;
      all_dapps.push(dapp)
    }

    // append the cards to the container
    document.getElementById('list').innerHTML += cards;

    if (dapps.length < 200) break;
  }

  //$('#loader').hide()
  document.getElementById('loader').style.display = 'none';

}

window.display_update = function(app_index) {

  var dapp = all_dapps[app_index]

  document.getElementById("appName").value = dapp.name
  document.getElementById("appDescription").value = dapp.description
  document.getElementById("web2URL").value = dapp.web2_url
  document.getElementById("web3URL").value = dapp.web3_url
  document.getElementById("image").value = dapp.image_url
  document.getElementById("tags").value = dapp.tags

  document.getElementById("addButton").style.display = "none"
  document.getElementById("updateButton").style.display = "block"
  document.getElementById("updateButton").setAttribute("onclick", "window.update_app(" + app_index + ")")

  document.getElementById("modalTitle").innerHTML = "Update App"

  if (!modal) {
    modal = new bootstrap.Modal(document.getElementById('appModal'))
  }
  modal.show()

}

function display_insert() {

  document.getElementById("appName").value = ""
  document.getElementById("appDescription").value = ""
  document.getElementById("web2URL").value = ""
  document.getElementById("web3URL").value = ""
  document.getElementById("image").value = ""
  document.getElementById("tags").value = ""

  document.getElementById("addButton").style.display = "block"
  document.getElementById("updateButton").style.display = "none"

  document.getElementById("modalTitle").innerHTML = "Add New App"

  if (!modal) {
    modal = new bootstrap.Modal(document.getElementById('appModal'))
  }
  modal.show()

}

function close_modal() {
  if (modal) {
    modal.hide()
  }
}

document.getElementById("connect-wallet").onclick = connect_wallet_click;
document.getElementById("displayInsert").onclick = display_insert;
document.getElementById("addButton").onclick = add_new_app;
document.getElementById("closeButton").onclick = close_modal;

update_list();
