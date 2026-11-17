(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,87323,37024,18102,96108,60728,28028,94433,40940,45284,t=>{"use strict";var e,r=t.i(24314);class i{constructor(t){"number"==typeof t?this.rawBinaryData=new ArrayBuffer(t):t instanceof Uint8Array?this.rawBinaryData=t.buffer:this.rawBinaryData=t,this.uint32View=new Uint32Array(this.rawBinaryData),this.float32View=new Float32Array(this.rawBinaryData),this.size=this.rawBinaryData.byteLength}get int8View(){return this._int8View||(this._int8View=new Int8Array(this.rawBinaryData)),this._int8View}get uint8View(){return this._uint8View||(this._uint8View=new Uint8Array(this.rawBinaryData)),this._uint8View}get int16View(){return this._int16View||(this._int16View=new Int16Array(this.rawBinaryData)),this._int16View}get int32View(){return this._int32View||(this._int32View=new Int32Array(this.rawBinaryData)),this._int32View}get float64View(){return this._float64Array||(this._float64Array=new Float64Array(this.rawBinaryData)),this._float64Array}get bigUint64View(){return this._bigUint64Array||(this._bigUint64Array=new BigUint64Array(this.rawBinaryData)),this._bigUint64Array}view(t){return this[`${t}View`]}destroy(){this.rawBinaryData=null,this.uint32View=null,this.float32View=null,this.uint16View=null,this._int8View=null,this._uint8View=null,this._int16View=null,this._int32View=null,this._float64Array=null,this._bigUint64Array=null}static sizeOf(t){switch(t){case"int8":case"uint8":return 1;case"int16":case"uint16":return 2;case"int32":case"uint32":case"float32":return 4;default:throw Error(`${t} isn't a valid view type`)}}}t.s(["ViewableBuffer",0,i],37024);var n=t.i(49864),a=t.i(48446);function s(t,e,r,i){if(r??(r=0),i??(i=Math.min(t.byteLength-r,e.byteLength)),7&r||7&i)if(3&r||3&i)new Uint8Array(e).set(new Uint8Array(t,r,i));else{let n=i/4;new Float32Array(e,0,n).set(new Float32Array(t,r,n))}else{let n=i/8;new Float64Array(e,0,n).set(new Float64Array(t,r,n))}}t.s(["fastCopy",0,s],18102);let o={normal:"normal-npm",add:"add-npm",screen:"screen-npm"};var l=((e=l||{})[e.DISABLED=0]="DISABLED",e[e.RENDERING_MASK_ADD=1]="RENDERING_MASK_ADD",e[e.MASK_ACTIVE=2]="MASK_ACTIVE",e[e.INVERSE_MASK_ACTIVE=3]="INVERSE_MASK_ACTIVE",e[e.RENDERING_MASK_REMOVE=4]="RENDERING_MASK_REMOVE",e[e.NONE=5]="NONE",e);function u(t,e){return"no-premultiply-alpha"===e.alphaMode&&o[t]||t}t.s(["BLEND_TO_NPM",0,o,"STENCIL_MODES",0,l],96108),t.s(["getAdjustedBlendModeBlend",0,u],60728);var h=t.i(29281);function d(t,e){if(0===t)throw Error("Invalid value of `0` passed to `checkMaxIfStatementsInShader`");let r=e.createShader(e.FRAGMENT_SHADER);try{for(;;){let i="precision mediump float;\nvoid main(void){\nfloat test = 0.1;\n%forloop%\ngl_FragColor = vec4(0.0);\n}".replace(/%forloop%/gi,function(t){let e="";for(let r=0;r<t;++r)r>0&&(e+="\nelse "),r<t-1&&(e+=`if(test == ${r}.0){}`);return e}(t));if(e.shaderSource(r,i),e.compileShader(r),e.getShaderParameter(r,e.COMPILE_STATUS))break;t=t/2|0}}finally{e.deleteShader(r)}return t}t.s(["checkMaxIfStatementsInShader",0,d],28028);let c=null;function x(){if(c)return c;let t=(0,h.getTestContext)();return c=d(c=t.getParameter(t.MAX_TEXTURE_IMAGE_UNITS),t),t.getExtension("WEBGL_lose_context")?.loseContext(),c}t.s(["getMaxTexturesPerBatch",0,x],94433);class f{constructor(){this.ids=Object.create(null),this.textures=[],this.count=0}clear(){for(let t=0;t<this.count;t++){let e=this.textures[t];this.textures[t]=null,this.ids[e.uid]=null}this.count=0}}t.s(["BatchTextureArray",0,f],40940);class p{constructor(){this.renderPipeId="batch",this.action="startBatch",this.start=0,this.size=0,this.textures=new f,this.blendMode="normal",this.topology="triangle-strip",this.canBundle=!0}destroy(){this.textures=null,this.gpuBindGroup=null,this.bindGroup=null,this.batcher=null,this.elements=null}}let m=[],_=0;function b(){return _>0?m[--_]:new p}function g(t){t.elements=null,m[_++]=t}a.GlobalResourceRegistry.register({clear:()=>{if(m.length>0)for(let t of m)t&&t.destroy();m.length=0,_=0}});let v=0,y=class t{constructor(e){this.uid=(0,r.uid)("batcher"),this.dirty=!0,this.batchIndex=0,this.batches=[],this._elements=[],(e={...t.defaultOptions,...e}).maxTextures||((0,n.deprecation)("v8.8.0","maxTextures is a required option for Batcher now, please pass it in the options"),e.maxTextures=x());const{maxTextures:a,attributesInitialSize:s,indicesInitialSize:o}=e;this.attributeBuffer=new i(4*s),this.indexBuffer=new Uint16Array(o),this.maxTextures=a}begin(){this.elementSize=0,this.elementStart=0,this.indexSize=0,this.attributeSize=0;for(let t=0;t<this.batchIndex;t++)g(this.batches[t]);this.batchIndex=0,this._batchIndexStart=0,this._batchIndexSize=0,this.dirty=!0}add(t){this._elements[this.elementSize++]=t,t._indexStart=this.indexSize,t._attributeStart=this.attributeSize,t._batcher=this,this.indexSize+=t.indexSize,this.attributeSize+=t.attributeSize*this.vertexSize}checkAndUpdateTexture(t,e){let r=t._batch.textures.ids[e._source.uid];return(!!r||0===r)&&(t._textureId=r,t.texture=e,!0)}updateElement(t){this.dirty=!0;let e=this.attributeBuffer;t.packAsQuad?this.packQuadAttributes(t,e.float32View,e.uint32View,t._attributeStart,t._textureId):this.packAttributes(t,e.float32View,e.uint32View,t._attributeStart,t._textureId)}break(t){let e=this._elements;if(!e[this.elementStart])return;let r=b(),i=r.textures;i.clear();let n=e[this.elementStart],a=u(n.blendMode,n.texture._source),s=n.topology;4*this.attributeSize>this.attributeBuffer.size&&this._resizeAttributeBuffer(4*this.attributeSize),this.indexSize>this.indexBuffer.length&&this._resizeIndexBuffer(this.indexSize);let o=this.attributeBuffer.float32View,l=this.attributeBuffer.uint32View,h=this.indexBuffer,d=this._batchIndexSize,c=this._batchIndexStart,x="startBatch",f=[],p=this.maxTextures;for(let n=this.elementStart;n<this.elementSize;++n){let m=e[n];e[n]=null;let _=m.texture._source,g=u(m.blendMode,_),y=a!==g||s!==m.topology;if(_._batchTick===v&&!y){m._textureId=_._textureBindLocation,d+=m.indexSize,m.packAsQuad?(this.packQuadAttributes(m,o,l,m._attributeStart,m._textureId),this.packQuadIndex(h,m._indexStart,m._attributeStart/this.vertexSize)):(this.packAttributes(m,o,l,m._attributeStart,m._textureId),this.packIndex(m,h,m._indexStart,m._attributeStart/this.vertexSize)),m._batch=r,f.push(m);continue}_._batchTick=v,(i.count>=p||y)&&(this._finishBatch(r,c,d-c,i,a,s,t,x,f),x="renderBatch",c=d,a=g,s=m.topology,(i=(r=b()).textures).clear(),f=[],++v),m._textureId=_._textureBindLocation=i.count,i.ids[_.uid]=i.count,i.textures[i.count++]=_,m._batch=r,f.push(m),d+=m.indexSize,m.packAsQuad?(this.packQuadAttributes(m,o,l,m._attributeStart,m._textureId),this.packQuadIndex(h,m._indexStart,m._attributeStart/this.vertexSize)):(this.packAttributes(m,o,l,m._attributeStart,m._textureId),this.packIndex(m,h,m._indexStart,m._attributeStart/this.vertexSize))}i.count>0&&(this._finishBatch(r,c,d-c,i,a,s,t,x,f),c=d,++v),this.elementStart=this.elementSize,this._batchIndexStart=c,this._batchIndexSize=d}_finishBatch(t,e,r,i,n,a,s,o,l){t.gpuBindGroup=null,t.bindGroup=null,t.action=o,t.batcher=this,t.textures=i,t.blendMode=n,t.topology=a,t.start=e,t.size=r,t.elements=l,++v,this.batches[this.batchIndex++]=t,s.add(t)}finish(t){this.break(t)}ensureAttributeBuffer(t){4*t<=this.attributeBuffer.size||this._resizeAttributeBuffer(4*t)}ensureIndexBuffer(t){t<=this.indexBuffer.length||this._resizeIndexBuffer(t)}_resizeAttributeBuffer(t){let e=new i(Math.max(t,2*this.attributeBuffer.size));s(this.attributeBuffer.rawBinaryData,e.rawBinaryData),this.attributeBuffer=e}_resizeIndexBuffer(t){let e=this.indexBuffer,r=Math.max(t,1.5*e.length);r+=r%2;let i=r>65535?new Uint32Array(r):new Uint16Array(r);if(i.BYTES_PER_ELEMENT!==e.BYTES_PER_ELEMENT)for(let t=0;t<e.length;t++)i[t]=e[t];else s(e.buffer,i.buffer);this.indexBuffer=i}packQuadIndex(t,e,r){t[e]=r+0,t[e+1]=r+1,t[e+2]=r+2,t[e+3]=r+0,t[e+4]=r+2,t[e+5]=r+3}packIndex(t,e,r,i){let n=t.indices,a=t.indexSize,s=t.indexOffset,o=t.attributeOffset;for(let t=0;t<a;t++)e[r++]=i+n[t+s]-o}destroy(t={}){if(null!==this.batches){for(let t=0;t<this.batchIndex;t++)g(this.batches[t]);this.batches=null,this.geometry.destroy(!0),this.geometry=null,t.shader&&(this.shader?.destroy(),this.shader=null);for(let t=0;t<this._elements.length;t++)this._elements[t]&&(this._elements[t]._batch=null);this._elements=null,this.indexBuffer=null,this.attributeBuffer.destroy(),this.attributeBuffer=null}}};y.defaultOptions={maxTextures:null,attributesInitialSize:4,indicesInitialSize:6},t.s(["Batch",0,p,"Batcher",0,y],87323);var S=t.i(85465),C=t.i(64957),w=t.i(60406);let B=new Float32Array(1),T=new Uint32Array(1);class M extends w.Geometry{constructor(){const t=new S.Buffer({data:B,label:"attribute-batch-buffer",usage:C.BufferUsage.VERTEX|C.BufferUsage.COPY_DST,shrinkToFit:!1});super({attributes:{aPosition:{buffer:t,format:"float32x2",stride:24,offset:0},aUV:{buffer:t,format:"float32x2",stride:24,offset:8},aColor:{buffer:t,format:"unorm8x4",stride:24,offset:16},aTextureIdAndRound:{buffer:t,format:"uint16x2",stride:24,offset:20}},indexBuffer:new S.Buffer({data:T,label:"index-batch-buffer",usage:C.BufferUsage.INDEX|C.BufferUsage.COPY_DST,shrinkToFit:!1})})}}t.s(["BatchGeometry",0,M],45284)},81491,94571,19273,49008,38939,58313,41183,83438,1560,68372,94111,55443,t=>{"use strict";var e=t.i(81107),r=t.i(27076),i=t.i(85830);function n(t,e,r){if(t)for(let n in t){let a=e[n.toLocaleLowerCase()];if(a){let e=t[n];"header"===n&&(e=e.replace(/@in\s+[^;]+;\s*/g,"").replace(/@out\s+[^;]+;\s*/g,"")),r&&a.push(`//----${r}----//`),a.push(e)}else(0,i.warn)(`${n} placement hook does not exist in shader`)}}t.s(["addBits",0,n],94571);let a=/\{\{(.*?)\}\}/g;function s(t){let e={};return(t.match(a)?.map(t=>t.replace(/[{()}]/g,""))??[]).forEach(t=>{e[t]=[]}),e}function o(t,e){let r,i=/@in\s+([^;]+);/g;for(;null!==(r=i.exec(t));)e.push(r[1])}function l(t,e,r=!1){let i=[];o(e,i),t.forEach(t=>{t.header&&o(t.header,i)}),r&&i.sort();let n=i.map((t,e)=>`       @location(${e}) ${t},`).join("\n"),a=e.replace(/@in\s+[^;]+;\s*/g,"");return a.replace("{{in}}",`
${n}
`)}function u(t,e){let r,i=/@out\s+([^;]+);/g;for(;null!==(r=i.exec(t));)e.push(r[1])}function h(t,e){let r=[];u(e,r),t.forEach(t=>{t.header&&u(t.header,r)});let i=0,n=r.sort().map(t=>t.indexOf("builtin")>-1?t:`@location(${i++}) ${t}`).join(",\n"),a=r.sort().map(t=>`       var ${t.replace(/@.*?\s+/g,"")};`).join("\n"),s=`return VSOutput(
            ${r.sort().map(t=>{let e;return` ${(e=/\b(\w+)\s*:/g.exec(t))?e[1]:""}`}).join(",\n")});`,o=e.replace(/@out\s+[^;]+;\s*/g,"");return(o=(o=o.replace("{{struct}}",`
${n}
`)).replace("{{start}}",`
${a}
`)).replace("{{return}}",`
${s}
`)}function d(t,e){let r=t;for(let t in e){let i=e[t];r=i.join("\n").length?r.replace(`{{${t}}}`,`//-----${t} START-----//
${i.join("\n")}
//----${t} FINISH----//`):r.replace(`{{${t}}}`,"")}return r}t.s(["compileHooks",0,s],19273),t.s(["compileInputs",0,l],49008),t.s(["compileOutputs",0,h],38939),t.s(["injectBits",0,d],58313);let c=Object.create(null),x=new Map,f=0;function p({template:t,bits:e}){var r,i;let n,a,s,o=_(t,e);if(c[o])return c[o];let{vertex:u,fragment:d}=(r=t,n=(i=e).map(t=>t.vertex).filter(t=>!!t),a=i.map(t=>t.fragment).filter(t=>!!t),s=l(n,r.vertex,!0),{vertex:s=h(n,s),fragment:l(a,r.fragment,!0)});return c[o]=b(u,d,e),c[o]}function m({template:t,bits:e}){let r=_(t,e);return c[r]||(c[r]=b(t.vertex,t.fragment,e)),c[r]}function _(t,e){return e.map(t=>(x.has(t)||x.set(t,f++),x.get(t))).sort((t,e)=>t-e).join("-")+t.vertex+t.fragment}function b(t,e,r){let i=s(t),a=s(e);return r.forEach(t=>{n(t.vertex,i,t.name),n(t.fragment,a,t.name)}),{vertex:d(t,i),fragment:d(e,a)}}t.s(["compileHighShader",0,p,"compileHighShaderGl",0,m],41183);let g=`
    @in aPosition: vec2<f32>;
    @in aUV: vec2<f32>;

    @out @builtin(position) vPosition: vec4<f32>;
    @out vUV : vec2<f32>;
    @out vColor : vec4<f32>;

    {{header}}

    struct VSOutput {
        {{struct}}
    };

    @vertex
    fn main( {{in}} ) -> VSOutput {

        var worldTransformMatrix = globalUniforms.uWorldTransformMatrix;
        var modelMatrix = mat3x3<f32>(
            1.0, 0.0, 0.0,
            0.0, 1.0, 0.0,
            0.0, 0.0, 1.0
          );
        var position = aPosition;
        var uv = aUV;

        {{start}}

        vColor = vec4<f32>(1., 1., 1., 1.);

        {{main}}

        vUV = uv;

        var modelViewProjectionMatrix = globalUniforms.uProjectionMatrix * worldTransformMatrix * modelMatrix;

        vPosition =  vec4<f32>((modelViewProjectionMatrix *  vec3<f32>(position, 1.0)).xy, 0.0, 1.0);

        vColor *= globalUniforms.uWorldColorAlpha;

        {{end}}

        {{return}}
    };
`,v=`
    @in vUV : vec2<f32>;
    @in vColor : vec4<f32>;

    {{header}}

    @fragment
    fn main(
        {{in}}
      ) -> @location(0) vec4<f32> {

        {{start}}

        var outColor:vec4<f32>;

        {{main}}

        var finalColor:vec4<f32> = outColor * vColor;

        {{end}}

        return finalColor;
      };
`,y=`
    in vec2 aPosition;
    in vec2 aUV;

    out vec4 vColor;
    out vec2 vUV;

    {{header}}

    void main(void){

        mat3 worldTransformMatrix = uWorldTransformMatrix;
        mat3 modelMatrix = mat3(
            1.0, 0.0, 0.0,
            0.0, 1.0, 0.0,
            0.0, 0.0, 1.0
          );
        vec2 position = aPosition;
        vec2 uv = aUV;

        {{start}}

        vColor = vec4(1.);

        {{main}}

        vUV = uv;

        mat3 modelViewProjectionMatrix = uProjectionMatrix * worldTransformMatrix * modelMatrix;

        gl_Position = vec4((modelViewProjectionMatrix * vec3(position, 1.0)).xy, 0.0, 1.0);

        vColor *= uWorldColorAlpha;

        {{end}}
    }
`,S=`

    in vec4 vColor;
    in vec2 vUV;

    out vec4 finalColor;

    {{header}}

    void main(void) {

        {{start}}

        vec4 outColor;

        {{main}}

        finalColor = outColor * vColor;

        {{end}}
    }
`;t.s(["fragmentGPUTemplate",0,v,"fragmentGlTemplate",0,S,"vertexGPUTemplate",0,g,"vertexGlTemplate",0,y],83438);let C={name:"global-uniforms-bit",vertex:{header:`
        struct GlobalUniforms {
            uProjectionMatrix:mat3x3<f32>,
            uWorldTransformMatrix:mat3x3<f32>,
            uWorldColorAlpha: vec4<f32>,
            uResolution: vec2<f32>,
        }

        @group(0) @binding(0) var<uniform> globalUniforms : GlobalUniforms;
        `}},w={name:"global-uniforms-ubo-bit",vertex:{header:`
          uniform globalUniforms {
            mat3 uProjectionMatrix;
            mat3 uWorldTransformMatrix;
            vec4 uWorldColorAlpha;
            vec2 uResolution;
          };
        `}},B={name:"global-uniforms-bit",vertex:{header:`
          uniform mat3 uProjectionMatrix;
          uniform mat3 uWorldTransformMatrix;
          uniform vec4 uWorldColorAlpha;
          uniform vec2 uResolution;
        `}};t.s(["globalUniformsBit",0,C,"globalUniformsBitGl",0,B,"globalUniformsUBOBitGl",0,w],1560),t.s(["compileHighShaderGlProgram",0,function({bits:t,name:r}){return new e.GlProgram({name:r,...m({template:{vertex:y,fragment:S},bits:[B,...t]})})},"compileHighShaderGpuProgram",0,function({bits:t,name:e}){let i=p({template:{fragment:v,vertex:g},bits:[C,...t]});return r.GpuProgram.from({name:e,vertex:{source:i.vertex,entryPoint:"main"},fragment:{source:i.fragment,entryPoint:"main"}})}],81491);let T={name:"color-bit",vertex:{header:`
            @in aColor: vec4<f32>;
        `,main:`
            vColor *= vec4<f32>(aColor.rgb * aColor.a, aColor.a);
        `}},M={name:"color-bit",vertex:{header:`
            in vec4 aColor;
        `,main:`
            vColor *= vec4(aColor.rgb * aColor.a, aColor.a);
        `}};t.s(["colorBit",0,T,"colorBitGl",0,M],68372);let G={},A={};t.s(["generateTextureBatchBit",0,function(t){return G[t]||(G[t]={name:"texture-batch-bit",vertex:{header:`
                @in aTextureIdAndRound: vec2<u32>;
                @out @interpolate(flat) vTextureId : u32;
            `,main:`
                vTextureId = aTextureIdAndRound.y;
            `,end:`
                if(aTextureIdAndRound.x == 1)
                {
                    vPosition = vec4<f32>(roundPixels(vPosition.xy, globalUniforms.uResolution), vPosition.zw);
                }
            `},fragment:{header:`
                @in @interpolate(flat) vTextureId: u32;

                ${function(t){let e=[];if(1===t)e.push("@group(1) @binding(0) var textureSource1: texture_2d<f32>;"),e.push("@group(1) @binding(1) var textureSampler1: sampler;");else{let r=0;for(let i=0;i<t;i++)e.push(`@group(1) @binding(${r++}) var textureSource${i+1}: texture_2d<f32>;`),e.push(`@group(1) @binding(${r++}) var textureSampler${i+1}: sampler;`)}return e.join("\n")}(t)}
            `,main:`
                var uvDx = dpdx(vUV);
                var uvDy = dpdy(vUV);

                ${function(t){let e=[];if(1===t)e.push("outColor = textureSampleGrad(textureSource1, textureSampler1, vUV, uvDx, uvDy);");else{e.push("switch vTextureId {");for(let r=0;r<t;r++)r===t-1?e.push("  default:{"):e.push(`  case ${r}:{`),e.push(`      outColor = textureSampleGrad(textureSource${r+1}, textureSampler${r+1}, vUV, uvDx, uvDy);`),e.push("      break;}");e.push("}")}return e.join("\n")}(t)}
            `}}),G[t]},"generateTextureBatchBitGl",0,function(t){return A[t]||(A[t]={name:"texture-batch-bit",vertex:{header:`
                in vec2 aTextureIdAndRound;
                out float vTextureId;

            `,main:`
                vTextureId = aTextureIdAndRound.y;
            `,end:`
                if(aTextureIdAndRound.x == 1.)
                {
                    gl_Position.xy = roundPixels(gl_Position.xy, uResolution);
                }
            `},fragment:{header:`
                in float vTextureId;

                uniform sampler2D uTextures[${t}];

            `,main:`

                ${function(t){let e=[];for(let r=0;r<t;r++)r>0&&e.push("else"),r<t-1&&e.push(`if(vTextureId < ${r}.5)`),e.push("{"),e.push(`	outColor = texture(uTextures[${r}], vUV);`),e.push("}");return e.join("\n")}(t)}
            `}}),A[t]}],94111);let P={name:"round-pixels-bit",vertex:{header:`
            fn roundPixels(position: vec2<f32>, targetSize: vec2<f32>) -> vec2<f32>
            {
                return (floor(((position * 0.5 + 0.5) * targetSize) + 0.5) / targetSize) * 2.0 - 1.0;
            }
        `}},I={name:"round-pixels-bit",vertex:{header:`
            vec2 roundPixels(vec2 position, vec2 targetSize)
            {
                return (floor(((position * 0.5 + 0.5) * targetSize) + 0.5) / targetSize) * 2.0 - 1.0;
            }
        `}};t.s(["roundPixelsBit",0,P,"roundPixelsBitGl",0,I],55443)},77953,t=>{"use strict";var e=t.i(32543);let r={};t.s(["getBatchSamplersUniformGroup",0,function(t){let i=r[t];if(i)return i;let n=new Int32Array(t);for(let e=0;e<t;e++)n[e]=e;return r[t]=new e.UniformGroup({uTextures:{value:n,type:"i32",size:t}},{isStatic:!0})}])},97828,75392,33219,t=>{"use strict";var e=t.i(47760),r=t.i(87323),i=t.i(45284),n=t.i(81491),a=t.i(68372),s=t.i(94111),o=t.i(55443),l=t.i(77953),u=t.i(65654);class h extends u.Shader{constructor(t){super({glProgram:(0,n.compileHighShaderGlProgram)({name:"batch",bits:[a.colorBitGl,(0,s.generateTextureBatchBitGl)(t),o.roundPixelsBitGl]}),gpuProgram:(0,n.compileHighShaderGpuProgram)({name:"batch",bits:[a.colorBit,(0,s.generateTextureBatchBit)(t),o.roundPixelsBit]}),resources:{batchSamplers:(0,l.getBatchSamplersUniformGroup)(t)}}),this.maxTextures=t}}t.s(["DefaultShader",0,h],75392);let d=null,c=class t extends r.Batcher{constructor(e){super(e),this.geometry=new i.BatchGeometry,this.name=t.extension.name,this.vertexSize=6,d??(d=new h(e.maxTextures)),this.shader=d}packAttributes(t,e,r,i,n){let a=n<<16|65535&t.roundPixels,s=t.transform,o=s.a,l=s.b,u=s.c,h=s.d,d=s.tx,c=s.ty,{positions:x,uvs:f}=t,p=t.color,m=t.attributeOffset,_=m+t.attributeSize;for(let t=m;t<_;t++){let n=2*t,s=x[n],m=x[n+1];e[i++]=o*s+u*m+d,e[i++]=h*m+l*s+c,e[i++]=f[n],e[i++]=f[n+1],r[i++]=p,r[i++]=a}}packQuadAttributes(t,e,r,i,n){let a=t.texture,s=t.transform,o=s.a,l=s.b,u=s.c,h=s.d,d=s.tx,c=s.ty,x=t.bounds,f=x.maxX,p=x.minX,m=x.maxY,_=x.minY,b=a.uvs,g=t.color,v=n<<16|65535&t.roundPixels;e[i+0]=o*p+u*_+d,e[i+1]=h*_+l*p+c,e[i+2]=b.x0,e[i+3]=b.y0,r[i+4]=g,r[i+5]=v,e[i+6]=o*f+u*_+d,e[i+7]=h*_+l*f+c,e[i+8]=b.x1,e[i+9]=b.y1,r[i+10]=g,r[i+11]=v,e[i+12]=o*f+u*m+d,e[i+13]=h*m+l*f+c,e[i+14]=b.x2,e[i+15]=b.y2,r[i+16]=g,r[i+17]=v,e[i+18]=o*p+u*m+d,e[i+19]=h*m+l*p+c,e[i+20]=b.x3,e[i+21]=b.y3,r[i+22]=g,r[i+23]=v}_updateMaxTextures(t){this.shader.maxTextures!==t&&(d=new h(t),this.shader=d)}destroy(){this.shader=null,super.destroy()}};c.extension={type:[e.ExtensionType.Batcher],name:"default"},t.s(["DefaultBatcher",0,c],97828),t.s(["GCManagedHash",0,class{constructor(t){this.items=Object.create(null);const{renderer:e,type:r,onUnload:i,priority:n,name:a}=t;this._renderer=e,e.gc.addResourceHash(this,"items",r,n??0),this._onUnload=i,this.name=a}add(t){return!this.items[t.uid]&&(this.items[t.uid]=t,t.once("unload",this.remove,this),t._gcLastUsed=this._renderer.gc.now,!0)}remove(t,...e){if(!this.items[t.uid])return;let r=t._gpuData[this._renderer.uid];r&&(this._onUnload?.(t,...e),t.off("unload",this.remove,this),r.destroy(),t._gpuData[this._renderer.uid]=null,this.items[t.uid]=null)}removeAll(...t){Object.values(this.items).forEach(e=>e&&this.remove(e,...t))}destroy(...t){this.removeAll(...t),this.items=Object.create(null),this._renderer=null,this._onUnload=null}}],33219)},68750,t=>{"use strict";var e=t.i(94359),r=t.i(31320);let i={};t.s(["getTextureBatchBindGroup",0,function(t,n,a){let s=0x811c9dc5;for(let e=0;e<n;e++)s^=t[e].uid,s=Math.imul(s,0x1000193)>>>0;return i[s]||function(t,n,a,s){let o={},l=0;for(let e=0;e<s;e++){let i=e<n?t[e]:r.Texture.EMPTY.source;o[l++]=i.source,o[l++]=i.style}let u=new e.BindGroup(o);return i[a]=u,u}(t,n,s,a)}])},94425,59691,55056,80493,t=>{"use strict";var e=t.i(49864),r=t.i(97377),i=t.i(20446),n=t.i(47760),a=t.i(30725),s=t.i(33219);class o{constructor(){this.isBatchable=!1}reset(){this.isBatchable=!1,this.context=null,this.graphicsData&&(this.graphicsData.destroy(),this.graphicsData=null)}destroy(){this.reset()}}class l{constructor(){this.instructions=new a.InstructionSet}init(){this.instructions.reset()}destroy(){this.instructions.destroy(),this.instructions=null}}let u=class t{constructor(t){this._renderer=t,this._managedContexts=new s.GCManagedHash({renderer:t,type:"resource",name:"graphicsContext"})}init(e){t.defaultOptions.bezierSmoothness=e?.bezierSmoothness??t.defaultOptions.bezierSmoothness}getContextRenderData(t){return this.getGpuContext(t).graphicsData||this._initContextRenderData(t)}updateGpuContext(t){let e=t._gpuData,r=!!e[this._renderer.uid],i=e[this._renderer.uid]||this._initContext(t);return(t.dirty||!r)&&(r&&i.reset(),i.isBatchable=!1,t.dirty=!1),i}getGpuContext(t){return t._gpuData[this._renderer.uid]||this._initContext(t)}_initContextRenderData(t){let e=new l;return this.getGpuContext(t).graphicsData=e,e.init(),e}_initContext(t){let e=new o;return e.context=t,t._gpuData[this._renderer.uid]=e,this._managedContexts.add(t),e}destroy(){this._managedContexts.destroy(),this._renderer=null}};u.extension={type:[n.ExtensionType.CanvasSystem],name:"graphicsContext"},u.defaultOptions={bezierSmoothness:.5},t.s(["CanvasGraphicsContextSystem",0,u],59691);var h=t.i(22558);class d{constructor(t,e){this.state=h.State.for2d(),this.renderer=t,this._adaptor=e,this.renderer.runners.contextChange.add(this),this._managedGraphics=new s.GCManagedHash({renderer:t,type:"renderable",priority:-1,name:"graphics"})}contextChange(){this._adaptor.contextChange(this.renderer)}validateRenderable(t){return!1}addRenderable(t,e){this._managedGraphics.add(t),this.renderer.renderPipes.batch.break(e),e.add(t)}updateRenderable(t){}execute(t){t.isRenderable&&this._adaptor.execute(this,t)}destroy(){this._managedGraphics.destroy(),this.renderer=null,this._adaptor.destroy(),this._adaptor=null}}d.extension={type:[n.ExtensionType.CanvasPipes],name:"graphics"},t.s(["CanvasGraphicsPipe",0,d],55056);var c=t.i(99166),x=t.i(74179),f=t.i(89506),p=t.i(1187);class m{constructor(){this.batches=[],this.batched=!1}destroy(){this.batches.forEach(t=>{x.BigPool.return(t)}),this.batches.length=0}}class _{constructor(t,e){this.state=h.State.for2d(),this.renderer=t,this._adaptor=e,this.renderer.runners.contextChange.add(this),this._managedGraphics=new s.GCManagedHash({renderer:t,type:"renderable",priority:-1,name:"graphics"})}contextChange(){this._adaptor.contextChange(this.renderer)}validateRenderable(t){let e=t.context,r=!!t._gpuData,i=this.renderer.graphicsContext.updateGpuContext(e);return!!i.isBatchable||r!==i.isBatchable}addRenderable(t,e){let r=this.renderer.graphicsContext.updateGpuContext(t.context);(t.didViewUpdate||!t._gpuData[this.renderer.uid])&&this._rebuild(t),r.isBatchable?this._addToBatcher(t,e):(this.renderer.renderPipes.batch.break(e),e.add(t))}updateRenderable(t){let e=this._getGpuDataForRenderable(t).batches;for(let t=0;t<e.length;t++){let r=e[t];r._batcher.updateElement(r)}}execute(t){if(!t.isRenderable)return;let e=this.renderer,r=t.context;if(!e.graphicsContext.getGpuContext(r).batches.length)return;let i=r.customShader||this._adaptor.shader;this.state.blendMode=t.groupBlendMode;let n=i.resources.localUniforms.uniforms;n.uTransformMatrix=t.groupTransform,n.uRound=e._roundPixels|t._roundPixels,(0,f.color32BitToUniform)(t.groupColorAlpha,n.uColor,0),this._adaptor.execute(this,t)}_rebuild(t){let e=this._getGpuDataForRenderable(t),r=this.renderer.graphicsContext.updateGpuContext(t.context);e.destroy(),r.isBatchable&&this._updateBatchesForRenderable(t,e)}_addToBatcher(t,e){let r=this.renderer.renderPipes.batch,i=this._getGpuDataForRenderable(t).batches;for(let t=0;t<i.length;t++){let n=i[t];r.addToBatch(n,e)}}_getGpuDataForRenderable(t){return t._gpuData[this.renderer.uid]||this._initGpuDataForRenderable(t)}_initGpuDataForRenderable(t){let e=new m;return t._gpuData[this.renderer.uid]=e,this._managedGraphics.add(t),e}_updateBatchesForRenderable(t,e){let r=t.context,i=this.renderer.graphicsContext.getGpuContext(r),n=this.renderer._roundPixels|t._roundPixels;e.batches=i.batches.map(e=>{let r=x.BigPool.get(p.BatchableGraphics);return e.copyTo(r),r.renderable=t,r.roundPixels=n,r})}destroy(){this._managedGraphics.destroy(),this.renderer=null,this._adaptor.destroy(),this._adaptor=null,this.state=null}}_.extension={type:[n.ExtensionType.WebGLPipes,n.ExtensionType.WebGPUPipes],name:"graphics"},t.s(["GraphicsGpuData",0,m,"GraphicsPipe",0,_],80493),n.extensions.add(d),n.extensions.add(_),n.extensions.add(u),n.extensions.add(c.GraphicsContextSystem);class b extends r.ViewContainer{constructor(t){t instanceof i.GraphicsContext&&(t={context:t});const{context:e,roundPixels:r,...n}=t||{};super({label:"Graphics",...n}),this.renderPipeId="graphics",e?this.context=e:(this.context=this._ownedContext=new i.GraphicsContext,this.context.autoGarbageCollect=this.autoGarbageCollect),this.didViewUpdate=!0,this.allowChildren=!1,this.roundPixels=r??!1}set context(t){t!==this._context&&(this._context&&(this._context.off("update",this.onViewUpdate,this),this._context.off("unload",this.unload,this)),this._context=t,this._context.on("update",this.onViewUpdate,this),this._context.on("unload",this.unload,this),this.onViewUpdate())}get context(){return this._context}get bounds(){return this._context.bounds}updateBounds(){}containsPoint(t){return this._context.containsPoint(t)}destroy(t){this._ownedContext&&!t?this._ownedContext.destroy(t):(!0===t||t?.context===!0)&&this._context.destroy(t),this._context?.off("update",this.onViewUpdate,this),this._context?.off("unload",this.unload,this),this._ownedContext=null,this._context=null,super.destroy(t)}_onTouch(t){this._gcLastUsed=t,this._context._gcLastUsed=t}_callContextMethod(t,e){return this.context[t](...e),this}setFillStyle(...t){return this._callContextMethod("setFillStyle",t)}setStrokeStyle(...t){return this._callContextMethod("setStrokeStyle",t)}fill(...t){return this._callContextMethod("fill",t)}stroke(...t){return this._callContextMethod("stroke",t)}texture(...t){return this._callContextMethod("texture",t)}beginPath(){return this._callContextMethod("beginPath",[])}cut(){return this._callContextMethod("cut",[])}arc(...t){return this._callContextMethod("arc",t)}arcTo(...t){return this._callContextMethod("arcTo",t)}arcToSvg(...t){return this._callContextMethod("arcToSvg",t)}bezierCurveTo(...t){return this._callContextMethod("bezierCurveTo",t)}closePath(){return this._callContextMethod("closePath",[])}ellipse(...t){return this._callContextMethod("ellipse",t)}circle(...t){return this._callContextMethod("circle",t)}path(...t){return this._callContextMethod("path",t)}lineTo(...t){return this._callContextMethod("lineTo",t)}moveTo(...t){return this._callContextMethod("moveTo",t)}quadraticCurveTo(...t){return this._callContextMethod("quadraticCurveTo",t)}rect(...t){return this._callContextMethod("rect",t)}roundRect(...t){return this._callContextMethod("roundRect",t)}poly(...t){return this._callContextMethod("poly",t)}regularPoly(...t){return this._callContextMethod("regularPoly",t)}roundPoly(...t){return this._callContextMethod("roundPoly",t)}roundShape(...t){return this._callContextMethod("roundShape",t)}filletRect(...t){return this._callContextMethod("filletRect",t)}chamferRect(...t){return this._callContextMethod("chamferRect",t)}star(...t){return this._callContextMethod("star",t)}svg(...t){return this._callContextMethod("svg",t)}restore(...t){return this._callContextMethod("restore",t)}save(){return this._callContextMethod("save",[])}getTransform(){return this.context.getTransform()}resetTransform(){return this._callContextMethod("resetTransform",[])}rotateTransform(...t){return this._callContextMethod("rotate",t)}scaleTransform(...t){return this._callContextMethod("scale",t)}setTransform(...t){return this._callContextMethod("setTransform",t)}transform(...t){return this._callContextMethod("transform",t)}translateTransform(...t){return this._callContextMethod("translate",t)}clear(){return this._callContextMethod("clear",[])}get fillStyle(){return this._context.fillStyle}set fillStyle(t){this._context.fillStyle=t}get strokeStyle(){return this._context.strokeStyle}set strokeStyle(t){this._context.strokeStyle=t}clone(t=!1){return t?new b(this._context.clone()):(this._ownedContext=null,new b(this._context))}lineStyle(t,r,i){(0,e.deprecation)(e.v8_0_0,"Graphics#lineStyle is no longer needed. Use Graphics#setStrokeStyle to set the stroke style.");let n={};return t&&(n.width=t),r&&(n.color=r),i&&(n.alpha=i),this.context.strokeStyle=n,this}beginFill(t,r){(0,e.deprecation)(e.v8_0_0,"Graphics#beginFill is no longer needed. Use Graphics#fill to fill the shape with the desired style.");let i={};return void 0!==t&&(i.color=t),void 0!==r&&(i.alpha=r),this.context.fillStyle=i,this}endFill(){(0,e.deprecation)(e.v8_0_0,"Graphics#endFill is no longer needed. Use Graphics#fill to fill the shape with the desired style."),this.context.fill();let t=this.context.strokeStyle;return(t.width!==i.GraphicsContext.defaultStrokeStyle.width||t.color!==i.GraphicsContext.defaultStrokeStyle.color||t.alpha!==i.GraphicsContext.defaultStrokeStyle.alpha)&&this.context.stroke(),this}drawCircle(...t){return(0,e.deprecation)(e.v8_0_0,"Graphics#drawCircle has been renamed to Graphics#circle"),this._callContextMethod("circle",t)}drawEllipse(...t){return(0,e.deprecation)(e.v8_0_0,"Graphics#drawEllipse has been renamed to Graphics#ellipse"),this._callContextMethod("ellipse",t)}drawPolygon(...t){return(0,e.deprecation)(e.v8_0_0,"Graphics#drawPolygon has been renamed to Graphics#poly"),this._callContextMethod("poly",t)}drawRect(...t){return(0,e.deprecation)(e.v8_0_0,"Graphics#drawRect has been renamed to Graphics#rect"),this._callContextMethod("rect",t)}drawRoundedRect(...t){return(0,e.deprecation)(e.v8_0_0,"Graphics#drawRoundedRect has been renamed to Graphics#roundRect"),this._callContextMethod("roundRect",t)}drawStar(...t){return(0,e.deprecation)(e.v8_0_0,"Graphics#drawStar has been renamed to Graphics#star"),this._callContextMethod("star",t)}}t.s(["Graphics",0,b],94425)}]);