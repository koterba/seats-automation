const crypto = require('crypto');

class Encryption {
    //Constants
    static constantKey = Buffer.from([13, 146, 236, 36, 206, 221, 229, 5]);
    static key = Buffer.from([241, 55, 32, 79, 252, 55, 172, 77, 98, 94, 137, 19, 247, 113, 197, 166]);
    static iv = Buffer.from([0, 92, 145, 239, 90, 227, 23, 59, 55, 190, 85, 212, 234, 73, 12, 146]);

    /**
     * Decrypts a Base64-encoded AES encrypted string using the provided key and IV.
     * The decrypted output is expected to be a hex string.
     * @param {string} text - The Base64-encoded encrypted text.
     * @returns {string} - The decrypted string.
     */
    static transformString(text) {
        try {
            const decipher = crypto.createDecipheriv('aes-128-cbc', Encryption.key, Encryption.iv);
            let decrypted = decipher.update(text, 'base64', 'utf8');
            decrypted += decipher.final('utf8');
            return decrypted;
        } catch (error) {
            console.error("Error in transformString:", error);
            return "";
        }
    }

    /**
     * Converts a hexadecimal string to a Buffer.
     * @param {string} hex - The hex string.
     * @returns {Buffer} - The buffer containing bytes.
     */
    static hexStringToByteArray(hex) {
        if (!hex) {
            return Buffer.alloc(0);
        }
        if (hex.length % 2 !== 0) {
            throw new Error("Invalid hex string length.");
        }
        return Buffer.from(hex, 'hex');
    }

    /**
     * Computes a SHA256 hash over the concatenation of two buffers and returns the first 8 bytes as a BigInt.
     * @param {Buffer} a - First buffer.
     * @param {Buffer} b - Second buffer.
     * @returns {BigInt} - The computed hash as a BigInt.
     */
    static computeHash(a, b) {
        const combined = Buffer.concat([a, b]);
        const hash = crypto.createHash('sha256').update(combined).digest();
        //Read the first 8 bytes as a little-endian unsigned 64-bit integer.
        return hash.readBigUInt64LE(0);
    }

    /**
     * Computes the fingerprint using the provided input string and mobile phone value.
     * The mobile phone value is expected to be an encrypted string.
     * @param {string} input - The concatenated input string.
     * @param {string} mobilePhone - The encrypted mobile phone string.
     * @returns {BigInt} - The computed fingerprint as a BigInt.
     */
    static computeFingerprint(input, mobilePhone) {
        //Decrypt the mobile phone string.
        const decryptedMobile = Encryption.transformString(mobilePhone);
        console.log("Decrypted Mobile:", decryptedMobile);

        //Convert the decrypted mobile string (expected to be hex) to a Buffer.
        const mobileBytes = Encryption.hexStringToByteArray(decryptedMobile);
        console.log("Mobile Bytes:", mobileBytes);

        //Compute an intermediate hash using the mobile bytes and the constant key.
        const mobileHash = Encryption.computeHash(mobileBytes, Encryption.constantKey);
        console.log("Mobile Hash:", mobileHash);

        //Convert the mobile hash to a Buffer (8 bytes, little-endian).
        const mobileHashBuffer = Buffer.alloc(8);
        mobileHashBuffer.writeBigUInt64LE(mobileHash);

        //Compute the final fingerprint hash using the input and the mobile hash bytes.
        const inputBuffer = Buffer.from(input, 'utf8');
        const finalHash = Encryption.computeHash(inputBuffer, mobileHashBuffer);
        console.log("Final Hash:", finalHash);
        return finalHash;
    }
}

module.exports = Encryption;