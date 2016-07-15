// (c) Copyright 2016, Sean Connelly (@voidqk), http://syntheti.cc
// MIT License
// Project Home: https://github.com/voidqk/sink

module.exports = {
	encode: function(str){ // UTF-16 JavaScript string to UTF-8 byte array
		var bytes = [];
		for (var i = 0; i < str.length; i++){
			var ch = str.charCodeAt(i);
			if (ch < 0x80)
				bytes.push(ch);
			else if (ch < 0x800){
				bytes.push(
					0xC0 | (ch >> 6),
					0x80 | (ch & 0x3F)
				);
			}
        	else if (ch < 0xD800 || ch >= 0xE000){
        		bytes.push(
        			0xE0 | (ch >> 12),
        			0x80 | ((ch >> 6) & 0x3F),
        			0x80 | (ch & 0x3F)
        		);
	        }
	        else{
	        	i++;
	        	var ch2 = str.charCodeAt(i);
	        	if (ch >= 0xD800 && ch < 0xDC00 && ch2 >= 0xDC00 && ch2 < 0xE000){
	        		ch = 0x10000 + (((ch & 0x3FF) << 10) | (ch2 & 0x3FF));
	        		bytes.push(
	        			0xF0 | (ch >> 18),
	        			0x80 | ((ch >> 12) & 0x3F),
	        			0x80 | ((ch >> 6) & 0x3F),
	        			0x80 | (ch & 0x3F)
	        		);
	        	}
	        	else
	        		throw new Error('Invalid UTF-16 string');
	        }
		}
		return bytes;
	},
	decode: function(bytes){ // UTF-8 byte array to UTF-16 JavaScript string
		var str = '';
		var i = 0, b, b2, b3, b4;
		while (true){
			if (i >= bytes.length)
				return str;

			// extract the code point into `b`
			b = bytes[i++];
			if (b < 0x80)
				/* do nothing */;
			else if (b >= 0xC0 && b < 0xE0){
				if (i >= bytes.length)
					break;
				b2 = bytes[i++];
				if (b2 < 0x80 || b2 >= 0xC0)
					break;
				b = ((b & 0x1F) << 6) | (b2 & 0x3F);
				if (b < 0x80) // reject overlong encodings
					break;
			}
			else if (b >= 0xE0 && b < 0xF0){
				if (i + 1 >= bytes.length)
					break;
				b2 = bytes[i++];
				if (b2 < 0x80 || b2 >= 0xC0)
					break;
				b3 = bytes[i++];
				if (b3 < 0x80 || b3 >= 0xC0)
					break;
				b = ((b & 0x0F) << 12) | ((b2 & 0x3F) << 6) | (b3 & 0x3F);
				if (b < 0x800) // reject overlong encodings
					break;
			}
			else if (b >= 0xF0 && b < 0xF8){
				if (i + 2 >= bytes.length)
					break;
				b2 = bytes[i++];
				if (b2 < 0x80 || b2 >= 0xC0)
					break;
				b3 = bytes[i++];
				if (b3 < 0x80 || b3 >= 0xC0)
					break;
				b4 = bytes[i++];
				if (b4 < 0x80 || b4 >= 0xC0)
					break;
				b = ((b & 0x07) << 18) | ((b2 & 0x3F) << 12) | ((b3 & 0x3F) << 6) | (b4 & 0x3F);
				if (b < 0x10000) // reject overlong encodings
					break;
			}
			else
				break;

			// encode codepoint `b` into UTF-16
			if (b < 0x10000){
				if (b >= 0xD800 && b < 0xE000) // reject surrogate pairs
					break;
				str += String.fromCharCode(b);
			}
			else{
				b -= 0x10000;
				str += String.fromCharCode((b >> 10) | 0xD800, (b & 0x3FF) | 0xDC00);
			}
		}
		throw new Error('Invalid UTF-8 string');
	}
};
