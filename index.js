require("dotenv").config();
const { ZDK, ZDKNetwork, ZDKChain } = require("@zoralabs/zdk");
const fs = require("fs");
const { Parser } = require("json2csv");

const networkInfo = {
  network: ZDKNetwork.Zora,
  chain: ZDKChain.ZoraMainnet,
};

const API_ENDPOINT = "https://api.zora.co/graphql";
const args = {
  endPoint: API_ENDPOINT,
  networks: [networkInfo],
  apiKey: process.env.API_KEY,
};

const zdk = new ZDK(args);

async function getTokenOwners(contractAddress) {
  let allTokenOwners = [];
  let hasNextPage = true;
  let endCursor = null;

  while (hasNextPage) {
    const query = {
      where: {
        collectionAddresses: [contractAddress],
      },
      pagination: {
        limit: 100,
        after: endCursor,
      },
      sort: {
        sortKey: "TIME",
        sortDirection: "ASC",
      },
    };

    try {
      const response = await zdk.mints(query);
      console.log("Full Response:", response);

      if (response && response.mints && response.mints.nodes) {
        const tokenOwners = response.mints.nodes.map(
          (node) => node.mint && node.mint.toAddress
        );
        allTokenOwners = allTokenOwners.concat(tokenOwners);
        hasNextPage = response.mints.pageInfo.hasNextPage;
        endCursor = response.mints.pageInfo.endCursor;
      } else {
        console.error("Unexpected response format:", response);
        hasNextPage = false;
      }
    } catch (error) {
      console.error("Error fetching token owners:", error);
      hasNextPage = false;
    }
  }

  // Remove duplicates
  const uniqueTokenOwners = [...new Set(allTokenOwners)];

  // Export the unique token owners to a CSV file
  const fields = ["address"];
  const json2csvParser = new Parser({ fields });
  const csv = json2csvParser.parse(
    uniqueTokenOwners.map((address) => ({ address }))
  );

  fs.writeFileSync("token_owners.csv", csv);

  console.log("Unique Token Owners:", uniqueTokenOwners);
  console.log("CSV file created successfully.");
}

const contractAddress = "0x0aa084283b00b72e08f6ae2273ee64d6a7ec17c6";
getTokenOwners(contractAddress);
