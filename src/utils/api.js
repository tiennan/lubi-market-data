const axios = require('axios')
require('dotenv').config()

class API {
  /**
   * 
   * @param {String} url 
   * @param {String} request GET|POST|PUT|DELETE|PATCH
   * @param {[String]} headers 
   * @param {String} data JSON String
   * @param {String} cookie 
   * @returns
    {
        "status": "ok",
        "cmd": "curl -L -X GET --user-agent \"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/84.0.4147.105 Safari/537.36\" https://medium.com/rd-tw/%E7%88%AC%E8%9F%B2%E5%AF%A6%E6%88%B0-%E6%80%8E%E6%A8%A3%E7%88%AC%E5%88%B0-instagram-%E7%9A%84%E8%B3%87%E6%96%99-8054fb0c4ded",
        "crawler": {
            "label": "SGP-V-05",
            "region": "sgp-v"
        },
        "response": "",
    }
   */
  static async curl(url, request, headers, data, cookie) {
    const apiUrl = process.env.API_DEARDEER_URL + '/reports/curl'
    const options = {
      headers: {
        'x-api-key': process.env.API_DEARDEER_KEY,
        // 'Content-Type': 'application/json',
      },
    }
    const requestBody = {
      url,
      request,
      headers,
      data,
      cookie,
    }
    const resp = await axios.post(apiUrl, requestBody, options)
    return resp.data
  }
}

module.exports = API