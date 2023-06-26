<?php

namespace Magezon\ProductMatrixCustom\Plugin\Block\Product\View\Type;

class Configurable
{
	/**
	 * @var \Magento\Framework\Registry
	 */
	protected $_coreRegistry;

	/**
	 * @var \Magento\Framework\Json\EncoderInterface
	 */
	protected $jsonEncoder;

	/**
	 * @var \Magezon\ProductMatrix\Helper\Data
	 */
	protected $dataHelper;

	/**
	 * @param \Magento\Framework\Json\EncoderInterface  $jsonEncoder           
	 * @param \Magento\Framework\Json\DecoderInterface  $jsonDecoder           
	 * @param \Magezon\ProductMatrix\Helper\Data        $dataHelper            
	 */
    public function __construct(
    	\Magento\Framework\Json\EncoderInterface $jsonEncoder,
        \Magento\Framework\Json\DecoderInterface $jsonDecoder,
		\Magezon\ProductMatrix\Helper\Data $dataHelper
    ) {
		$this->jsonEncoder = $jsonEncoder;
		$this->jsonDecoder = $jsonDecoder;
		$this->dataHelper = $dataHelper;
    }

	public function afterGetJsonConfig(
		\Magento\ConfigurableProduct\Block\Product\View\Type\Configurable $subject,
		$result
	) {
		if ($this->dataHelper->isEnabled()) {
			$product = $subject->getProduct();
			$result = $this->jsonDecoder->decode($result); 
			$result['fakeHeadingLabel'] = $product->getFakeHeadingLabel();
			$result['fakeAttributeLabel'] = $product->getFakeAttributeLabel();
			$result = $this->jsonEncoder->encode($result);
		}

		return $result;
	}
}