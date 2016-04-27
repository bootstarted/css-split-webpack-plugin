import postcss from 'postcss';
import plugin from '../../src/chunk';
import {expect} from 'chai';

const input = `
one {}
two {}
three {}
four {}
five {}
six {}
seven {}
eight {}
nine {}
ten {}
eleven {}
twelve {}
`;

const test = (input, opts) => postcss([plugin(opts)]).process(input);

describe('chunk', () => {
  it('breaks input into chunks of max size', () => {
    return test(input, {size: 5}).then(({chunks}) => {
      expect(chunks.length).to.equal(3);
      expect(chunks[0].root.nodes.length).to.equal(5);
      expect(chunks[2].root.nodes.length).to.equal(2);
    });
  });

  it('counts multiple selectors per rule', () => {
    const newInput = input.replace('two', 'two-a, two-b');
    return test(newInput, {size: 5}).then(({chunks}) => {
      expect(chunks.length).to.equal(3);
      expect(chunks[0].root.nodes.length).to.equal(4);
      expect(chunks[2].root.nodes.length).to.equal(3);
    });
  });

  it('counts at-rules as one rule', () => {
    const newInput = `${input} @media print { a {}, b {}, c {} }`;
    return test(newInput, {size: 5}).then(({chunks}) => {
      expect(chunks.length).to.equal(4);
      expect(chunks[3].root.nodes.length).to.equal(1);
    });
  });

  it('supports nested at-rules', () => {
    const media = '@media print { @media print { a {}, b {}, c {} } }';
    const newInput = input + media;
    return test(newInput, {size: 5}).then(({chunks}) => {
      expect(chunks.length).to.equal(4);
      expect(chunks[3].root.nodes.length).to.equal(1);
    });
  });
});
