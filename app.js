var herajs = require('@herajs/client');
var aergo;
var chainId = 'testnet.aergo.io';

const ecosystem_address_mainnet = ""
const ecosystem_address_testnet = "AmhYzCrqoYJXGpQiCbvMPaT1bCTbPL5E8J3R5cgsYNkLPicDTacU"
const ecosystem_address_alphanet = ""
var ecosystem_address

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

    for (var dapp of dapps) {

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
<div class="card">
  <div class="card-img-top">
    <img class="card-img-top" src="${dapp.image_url}" onerror="this.src='images/favicon.png';"/>
  </div>
  <div class="card-body">
    <h5 class="card-title">${dapp.name}</h5>
    <p class="card-text">${dapp.description}</p>
    <a href="${dapp.web2_url}" class="btn btn-primary ${has_web2}" target="_blank">Web2</a>
    <a href="${dapp.web3_url}" class="btn btn-primary ${has_web3}" target="_blank">Web3</a>
  </div>
  </div>
</div>`;

      cards += card;
    }

    // append the cards to the container
    document.getElementById('list').innerHTML += cards;

    if (dapps.length < 200) break;
  }

  //$('#loader').hide()
  document.getElementById('loader').style.display = 'none';

}

update_list();
