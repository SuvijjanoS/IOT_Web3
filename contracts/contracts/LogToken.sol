// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title LogToken
 * @dev ERC-721 NFT contract where each token represents a log hash
 * Used for tamper-proof verification of IoT device logs and command logs
 */
contract LogToken is ERC721, Ownable {
    enum LogType { DEVICE_LOG, COMMAND_LOG }

    struct LogMeta {
        bytes32 logHash;      // SHA256 hash of the canonical log file
        bytes32 deviceId;     // Which device it belongs to
        LogType logType;      // DEVICE_LOG or COMMAND_LOG
        uint64 loggedAt;      // Timestamp (off-chain or block time)
        string uri;           // Optional IPFS / S3 pointer
    }

    uint256 public nextTokenId = 1;
    mapping(uint256 => LogMeta) public logs;
    mapping(bytes32 => uint256[]) public hashToTokens; // logHash => array of tokenIds

    event LogMinted(
        uint256 indexed tokenId,
        bytes32 indexed deviceId,
        bytes32 indexed logHash,
        LogType logType,
        address owner
    );

    constructor() ERC721("IoTLogToken", "IOTLOG") Ownable(msg.sender) {}

    /**
     * @dev Mint a new log token
     * @param to The address that will own the token (device wallet or command center wallet)
     * @param deviceId The device identifier this log belongs to
     * @param logHash The SHA256 hash of the canonicalized log file
     * @param logType DEVICE_LOG or COMMAND_LOG
     * @param loggedAt Timestamp when the log was created
     * @param uri Optional URI pointing to the log file (IPFS, S3, etc.)
     * @return tokenId The ID of the newly minted token
     */
    function mintLog(
        address to,
        bytes32 deviceId,
        bytes32 logHash,
        LogType logType,
        uint64 loggedAt,
        string calldata uri
    ) external onlyOwner returns (uint256 tokenId) {
        require(to != address(0), "invalid recipient");
        tokenId = nextTokenId++;
        _safeMint(to, tokenId);
        
        logs[tokenId] = LogMeta({
            logHash: logHash,
            deviceId: deviceId,
            logType: logType,
            loggedAt: loggedAt,
            uri: uri
        });
        
        hashToTokens[logHash].push(tokenId);
        
        emit LogMinted(tokenId, deviceId, logHash, logType, to);
    }

    /**
     * @dev Find all tokens with a given log hash
     * @param logHash The hash to search for
     * @return tokenIds Array of token IDs with this hash
     */
    function findTokensByHash(bytes32 logHash) external view returns (uint256[] memory) {
        return hashToTokens[logHash];
    }

    /**
     * @dev Get log metadata for a token
     * @param tokenId The token ID
     * @return logMeta The log metadata struct
     */
    function getLogMeta(uint256 tokenId) external view returns (LogMeta memory) {
        require(_ownerOf(tokenId) != address(0), "token does not exist");
        return logs[tokenId];
    }
}

