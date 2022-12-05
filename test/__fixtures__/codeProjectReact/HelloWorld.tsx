// @ts-nocheck

import React from 'react'
import { T } from '@tolgee/react'

export default function HelloWorld () {
  return (
    <>
      <h3><T keyName='hello-world' defaultValue='Hello world!'/></h3>
      <p>
        <T keyName='lorem-ipsum'>
          Lorem ipsum dolor sit amet consectetur adipisicing elit. Dolor consequatur facilis quaerat recusandae, minima sint odio laborum amet obcaecati facere laboriosam, reiciendis sapiente mollitia. Minus hic dolores distinctio voluptatum earum.
        </T>
      </p>
    </>
  )
}
