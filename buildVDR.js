// User Secret + Org Secret
const authorization = 'User D5TQ9gkU9eghndlBJCCKVELOrK3TyC6rouXo6LkUGxI=, Organization e737a005d47a67e852733a4d329a7600'
// set the environment - 'snapshot' 'staging' 'prod' 'local (default)'
const environment = 'local'
const vdr_name = 'erpInvoices'
const object_name = 'Invoice'
// const element_id = 'hubspotcrm'
// const element_id = 'sfdc'
const element_id = 'netsuiteerpv2'
// const element_id = 'sugarsell'

// Add VDR fields
let objDef = `billingAddress.state

billingAddress.city

billingAddress.country

billingAddress.geoCodeAccuracy

billingAddress.latitude

billingAddress.longitude

billingAddress.street1

billingAddress.street2

billingAddress.street3

billingAddress.street4

billingAddress.zipCode

shippingAddress.state

shippingAddress.city

shippingAddress.country

shippingAddress.geoCodeAccuracy

shippingAddress.latitude

shippingAddress.longitude

shippingAddress.street1

shippingAddress.zipCode

shippingAddress.street2

shippingAddress.street3

shippingAddress.street4

shippingAddress.name

customerId

transactionStatus

exchangeRate

currency

docNumber

erpId

customerNotes

expirationDate

deliveryDate

created

lastModified

shippingMethod
shippingDate
shippingAmount

invoiceTotal

paymentTerms

parentDocumentNumber

parentDocType

name

transactionDate

erpTenant

created`
// Add transformations in the same order as VDR fields
let transform = `billingAddress.state

billingAddress.city

billingAddress.country

NA

NA

NA

concat(billingAddress.addr1,billingAddress.addr2,billingAddress.addr3)

NA

NA

NA

billingAddress.zip

shippingAddress.state

shippingAddress.city

shippingAddress.country

NA

NA

NA

concat(shippingAddress.addr1,shippingAddress.addr2,shippingAddress.addr3)

shippingAddress.zip

NA

NA

NA

shippingAddress.addressee

entity.internalId

NA

exchangeRate

currency.internalId

tranId

internalId

description

NA

NA

createDate

lastModifiedDate

shipMethod.internalId
shipDate
shippingCost

total

terms.internalId

createdFrom.internalId

NA

otherRefNum

tranDate

subsidiary.internalId

createdDate`


objDef = objDef.split(/\r?\n/)
transform = transform.split(/\r?\n/)

const rp = require('request-promise')
// Build the full path to the resource.
const buildHostPath = (env) => {
  let path = ''
  switch (env) {
    case 'staging':
      path = 'https://staging.cloud-elements.com'
      break
    case 'snapshot':
      path = 'https://snapshot.cloud-elements.com'
      break
    case 'prod':
      path = 'https://api.cloud-elements.com'
      break
    default:
      path = 'http://localhost:8080'
      break
  }
  return path
}

const hostPath = buildHostPath(environment)
const buildRequestPath = (resource) => {
  const r = `${hostPath}/elements/api-v2/${resource}`
  return encodeURI(r)
}

const myRequest = (resource, method, parameters, body) => {
  const options = {
    uri: buildRequestPath(resource),
    method: method,
    json: true,
    headers: {
      Authorization: authorization,
      accept: 'application/json',
      'Content-Type': 'application/json'
    },
    body: body,
    qs: parameters
  }
  return rp(options)
}
const stripSpaces = (name) => name ? `${name}`.replace(' ', '') : name
const generateObjDef = (path) => ({ displayName: stripSpaces(path), path: stripSpaces(path), type: 'string' })
const generateTransformation = (path, vendorPath) => ({ level: 'organization', path: stripSpaces(path), type: 'string', vendorPath: stripSpaces(vendorPath) })

async function buildVDRs (def, tran, vdrName, vendorName, elementId) {
  const vdrDef = {
    fields: []
  }
  const vdr = {
    fields: [],
    configuration: [
      {
        type: 'inherit'
      },
      {
        type: 'addToDocumentation'
      },
      {
        properties: {
          fromVendor: false,
          toVendor: false
        },
        type: 'passThrough'
      }
    ],
    vendorName: vendorName
  }
  def.forEach((objDefinition, i) => {
    if(objDefinition){
      vdrDef.fields.push(generateObjDef(objDefinition))
      if (tran[i] && tran[i] !== 'NA') { vdr.fields.push(generateTransformation(objDefinition, tran[i])) }
    }
  })

  const objDef = await myRequest(`organizations/objects/${vdrName}/definitions`, 'POST', null, vdrDef)
  const finalVdr = await myRequest(`organizations/elements/${elementId}/transformations/${vdrName}`, 'POST', null, vdr)
  console.log(JSON.stringify(objDef))
  console.log(JSON.stringify(finalVdr))
}

const buildErrorObject = (rpError) => {
  const errorObj = {}
  if (rpError.response) {
    errorObj.response_error_message = JSON.stringify(rpError.response.body)
    errorObj.response_status_code = rpError.response.statusCode
  } else {
    errorObj.response_error_message = rpError.message
    errorObj.statusCode = 501
  }
  console.log(errorObj)
}

buildVDRs(objDef, transform, vdr_name, object_name, element_id)
  .catch((err) => buildErrorObject(err))
